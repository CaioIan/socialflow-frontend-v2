export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let promptPendente: BeforeInstallPromptEvent | null = null;
const ouvintes = new Set<() => void>();
let inicializado = false;

export const MENSAGEM_INSTALACAO_INICIADA =
  'Instalação iniciada. Aguarde o dispositivo concluir a instalação do SocialFlow.';

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function inicializarCapturaDeInstalacao() {
  if (inicializado || typeof window === 'undefined') return;
  inicializado = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptPendente = event as BeforeInstallPromptEvent;
    avisar();
  });

  window.addEventListener('appinstalled', () => {
    promptPendente = null;
    avisar();
  });
}

export function observarInstalacao(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function obterPromptDeInstalacao(): BeforeInstallPromptEvent | null {
  return promptPendente;
}

export function estaEmModoAplicativo(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function ehIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export async function solicitarInstalacao(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = promptPendente;
  if (!prompt) return 'unavailable';

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  promptPendente = null;
  avisar();
  return outcome;
}
