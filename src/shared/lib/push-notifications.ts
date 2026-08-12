import api from '@/api/axios';

export interface PushPublicKeyResponse {
  publicKey: string | null;
}

export function navegadorSuportaPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

let registroPromise: Promise<ServiceWorkerRegistration> | null = null;

export function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service Worker não suportado'));
  }

  registroPromise ??= navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return registroPromise;
}

export async function buscarChavePublicaPush(): Promise<string | null> {
  const response = await api.get<PushPublicKeyResponse>('/notifications/push/public-key');
  return response.data.publicKey;
}

export async function obterInscricaoPush(): Promise<PushSubscription | null> {
  if (!navegadorSuportaPush()) return null;
  const registro = await registrarServiceWorker();
  return await registro.pushManager.getSubscription();
}

export async function ativarPush(chavePublica: string): Promise<PushSubscription> {
  if (!navegadorSuportaPush()) throw new Error('Push não suportado neste navegador');

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('Permissão de notificações não concedida');

  const registro = await registrarServiceWorker();
  const existente = await registro.pushManager.getSubscription();
  const subscription =
    existente ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveVapidParaArrayBuffer(chavePublica),
    }));

  await salvarInscricaoPush(subscription);
  return subscription;
}

/** Reassocia uma inscrição já permitida à conta que acabou de entrar. */
export async function sincronizarInscricaoPushExistente(): Promise<void> {
  if (!navegadorSuportaPush() || Notification.permission !== 'granted') return;

  const subscription = await obterInscricaoPush();
  if (subscription) await salvarInscricaoPush(subscription);
}

export async function removerPushNesteDispositivo(): Promise<void> {
  if (!navegadorSuportaPush()) return;

  const subscription = await obterInscricaoPush();
  if (!subscription) return;

  try {
    await api.delete('/notifications/push/subscriptions', {
      data: { endpoint: subscription.endpoint },
    });
  } finally {
    // Mesmo que a API esteja temporariamente indisponível, este navegador para
    // de receber. O endpoint abandonado será removido quando o provedor marcar
    // a inscrição como expirada.
    await subscription.unsubscribe();
  }
}

/**
 * No logout, tira o endpoint da conta sem revogar a permissão do navegador.
 * Assim, ao entrar novamente no mesmo aparelho, a inscrição pode ser associada
 * à nova sessão sem pedir autorização outra vez. Se o servidor não confirmar a
 * remoção, revogamos localmente para não deixar a conta anterior exposta.
 */
export async function desvincularPushAoSair(): Promise<void> {
  if (!navegadorSuportaPush()) return;

  const subscription = await obterInscricaoPush();
  if (!subscription) return;

  try {
    await api.delete('/notifications/push/subscriptions', {
      data: { endpoint: subscription.endpoint },
    });
  } catch (erro) {
    await subscription.unsubscribe();
    throw erro;
  }
}

async function salvarInscricaoPush(subscription: PushSubscription): Promise<void> {
  const serializada = subscription.toJSON();
  const p256dh = serializada.keys?.p256dh;
  const auth = serializada.keys?.auth;

  if (!p256dh || !auth) throw new Error('Chaves da inscrição push não disponíveis');

  await api.post('/notifications/push/subscriptions', {
    endpoint: subscription.endpoint,
    keys: { p256dh, auth },
  });
}

function chaveVapidParaArrayBuffer(chave: string): ArrayBuffer {
  const preenchimento = '='.repeat((4 - (chave.length % 4)) % 4);
  const base64 = (chave + preenchimento).replace(/-/g, '+').replace(/_/g, '/');
  const binario = window.atob(base64);
  const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
  return bytes.buffer;
}
