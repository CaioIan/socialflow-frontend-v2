import { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Download,
  Share2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useToastStore } from '@/stores/use-toast-store';
import {
  ehIos,
  estaEmModoAplicativo,
  MENSAGEM_INSTALACAO_INICIADA,
  observarInstalacao,
  obterPromptDeInstalacao,
  solicitarInstalacao,
} from '@/shared/lib/pwa-install';
import {
  ativarPush,
  buscarChavePublicaPush,
  navegadorSuportaPush,
  obterInscricaoPush,
  removerPushNesteDispositivo,
} from '@/shared/lib/push-notifications';
import { Modal } from '@/shared/components/modal';
import { ToggleSwitch } from '@/shared/components/toggle-switch';

type EstadoPush =
  | 'carregando'
  | 'ativo'
  | 'inativo'
  | 'negado'
  | 'instale-no-ios'
  | 'indisponivel'
  | 'nao-configurado';

export function PushNotificationControl() {
  const { addToast } = useToastStore();
  const [estado, setEstado] = useState<EstadoPush>('carregando');
  const [processando, setProcessando] = useState(false);
  const [instalado, setInstalado] = useState(estaEmModoAplicativo());
  const [podeInstalar, setPodeInstalar] = useState(Boolean(obterPromptDeInstalacao()));
  const [modalDePermissaoAberto, setModalDePermissaoAberto] = useState(false);
  const ios = ehIos();

  const atualizarEstado = useCallback(async () => {
    if (!navegadorSuportaPush()) {
      setEstado('indisponivel');
      return;
    }

    if (ios && !estaEmModoAplicativo()) {
      setEstado('instale-no-ios');
      return;
    }

    if (Notification.permission === 'denied') {
      setEstado('negado');
      return;
    }

    try {
      const chavePublica = await buscarChavePublicaPush();
      if (!chavePublica) {
        setEstado('nao-configurado');
        return;
      }

      const subscription = await obterInscricaoPush();
      setEstado(subscription ? 'ativo' : 'inativo');
    } catch {
      setEstado('indisponivel');
    }
  }, [ios]);

  useEffect(() => {
    const timer = window.setTimeout(() => void atualizarEstado(), 0);
    const pararDeObservar = observarInstalacao(() => {
      setPodeInstalar(Boolean(obterPromptDeInstalacao()));
      setInstalado(estaEmModoAplicativo());
    });

    return () => {
      window.clearTimeout(timer);
      pararDeObservar();
    };
  }, [atualizarEstado]);

  const ativarNesteDispositivo = async () => {
    setProcessando(true);

    try {
      const chavePublica = await buscarChavePublicaPush();
      if (!chavePublica) {
        setEstado('nao-configurado');
        return;
      }

      await ativarPush(chavePublica);
      setEstado('ativo');
      addToast('Notificações push ativadas neste dispositivo.', 'success');
    } catch {
      await atualizarEstado();
      addToast('Não foi possível alterar as notificações push.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  const alternarPush = async () => {
    if (estado !== 'ativo' && estado !== 'inativo') return;

    if (estado === 'ativo') {
      setProcessando(true);
      try {
        await removerPushNesteDispositivo();
        setEstado('inativo');
        addToast('Notificações push desativadas neste dispositivo.', 'success');
      } catch {
        await atualizarEstado();
        addToast('Não foi possível alterar as notificações push.', 'error');
      } finally {
        setProcessando(false);
      }
      return;
    }

    if (Notification.permission === 'default') {
      setModalDePermissaoAberto(true);
      return;
    }

    await ativarNesteDispositivo();
  };

  const confirmarPermissao = async () => {
    setModalDePermissaoAberto(false);
    await ativarNesteDispositivo();
  };

  const instalar = async () => {
    const resultado = await solicitarInstalacao();
    setPodeInstalar(Boolean(obterPromptDeInstalacao()));

    if (resultado === 'accepted') {
      addToast(MENSAGEM_INSTALACAO_INICIADA, 'info');
    }
  };

  const ligado = estado === 'ativo';
  const permiteAlternar = estado === 'ativo' || estado === 'inativo';

  return (
    <div className="space-y-6 pt-6 border-t border-white/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <BellRing className="h-4 w-4 shrink-0 text-zinc-500" />
              Avisos push
            </h2>
            {ligado && (
              <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                Ativo neste dispositivo
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Chegam na hora neste dispositivo. Se o e-mail estiver ativo, ele
            continua funcionando separadamente e pode reunir vários eventos.
          </p>
          <MensagemDoEstado estado={estado} />
        </div>

        <ToggleSwitch
          checked={ligado}
          disabled={!permiteAlternar || processando}
          loading={processando}
          onClick={() => void alternarPush()}
          ariaLabel="Receber avisos push neste dispositivo"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient">
            {instalado ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">
              {instalado ? 'SocialFlow instalado' : 'Instale o SocialFlow'}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {instalado
                ? 'Você está usando a versão instalada, com acesso pelo ícone do aparelho.'
                : ios
                  ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. No iPhone, isso é necessário para receber push.'
                  : 'Tenha um ícone na tela inicial e abra o SocialFlow como aplicativo, sem instalar pela loja.'}
            </p>

            {!instalado && ios && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300">
                <Share2 className="h-4 w-4 text-primary" />
                Compartilhar → Adicionar à Tela de Início
              </div>
            )}

            {!instalado && !ios && podeInstalar && (
              <button
                type="button"
                onClick={instalar}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold transition-transform active:scale-95"
              >
                <Download className="h-4 w-4" />
                Instalar SocialFlow
              </button>
            )}

            {!instalado && !ios && !podeInstalar && (
              <p className="mt-3 text-[11px] text-zinc-600">
                Se o botão não aparecer, use a opção “Instalar aplicativo” no menu do navegador.
              </p>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalDePermissaoAberto}
        onClose={() => setModalDePermissaoAberto(false)}
        title="Permita as notificações"
      >
        <div className="space-y-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-zinc-300">
              Na próxima mensagem do navegador, toque em <strong className="text-white">Permitir</strong>{' '}
              para receber avisos do SocialFlow neste dispositivo.
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              O push chega imediatamente. Seus avisos por e-mail continuam ativos separadamente.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setModalDePermissaoAberto(false)}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => void confirmarPermissao()}
              className="flex-[1.4] rounded-xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
            >
              Continuar e permitir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MensagemDoEstado({ estado }: { estado: EstadoPush }) {
  const mensagens: Partial<Record<EstadoPush, string>> = {
    carregando: 'Verificando este dispositivo...',
    negado: 'A permissão foi bloqueada. Libere as notificações nas configurações do navegador.',
    'instale-no-ios': 'Instale o SocialFlow na Tela de Início e abra pelo ícone para ativar o push.',
    indisponivel: 'Este navegador não oferece notificações push ou o serviço está indisponível.',
    'nao-configurado': 'O push ainda não foi configurado neste ambiente.',
  };
  const mensagem = mensagens[estado];
  if (!mensagem) return null;

  return <p className="mt-2 text-[11px] leading-relaxed text-amber-300/80">{mensagem}</p>;
}
