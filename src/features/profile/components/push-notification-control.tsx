import { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Download,
  Loader2,
  Share2,
  Smartphone,
} from 'lucide-react';
import { useToastStore } from '@/stores/use-toast-store';
import {
  ehIos,
  estaEmModoAplicativo,
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

  const alternarPush = async () => {
    if (estado !== 'ativo' && estado !== 'inativo') return;
    setProcessando(true);

    try {
      if (estado === 'ativo') {
        await removerPushNesteDispositivo();
        setEstado('inativo');
        addToast('Notificações push desativadas neste dispositivo.', 'success');
      } else {
        const chavePublica = await buscarChavePublicaPush();
        if (!chavePublica) {
          setEstado('nao-configurado');
          return;
        }

        await ativarPush(chavePublica);
        setEstado('ativo');
        addToast('Notificações push ativadas neste dispositivo.', 'success');
      }
    } catch {
      await atualizarEstado();
      addToast('Não foi possível alterar as notificações push.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  const instalar = async () => {
    const resultado = await solicitarInstalacao();
    setPodeInstalar(Boolean(obterPromptDeInstalacao()));

    if (resultado === 'accepted') {
      addToast('SocialFlow instalado. Abra pelo novo ícone do aplicativo.', 'success');
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

        <button
          type="button"
          role="switch"
          aria-checked={ligado}
          aria-label="Receber avisos push neste dispositivo"
          disabled={!permiteAlternar || processando}
          onClick={alternarPush}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            ligado ? 'bg-primary' : 'bg-white/10'
          }`}
        >
          <span
            className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white transition-transform ${
              ligado ? 'translate-x-6' : 'translate-x-1'
            }`}
          >
            {processando && <Loader2 className="h-3 w-3 animate-spin text-zinc-700" />}
          </span>
        </button>
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
