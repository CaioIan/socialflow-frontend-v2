import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Camera as InstagramIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Link2Off,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import axios from 'axios';
import { GlassCard } from '@/shared/components/glass-card';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { useToastStore } from '@/stores/use-toast-store';
import { useOrganizationAccess } from '@/shared/hooks/use-organization-access';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { instagramService } from '../api/instagram-service';

function mensagemDoErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    const mensagem = erro.response?.data?.message;
    if (Array.isArray(mensagem)) return mensagem.join(' ');
    if (typeof mensagem === 'string') return mensagem;
  }
  return 'Não foi possível concluir a operação.';
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function InstagramPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { hasAccess, isLoading: isSyncingOrg } = useOrganizationAccess(orgId);

  const [igUserId, setIgUserId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [confirmandoDesconexao, setConfirmandoDesconexao] = useState(false);

  const { data: organizacao } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => organizationsService.getById(orgId!),
    enabled: !!orgId && hasAccess,
  });

  const { data: conta, isLoading } = useQuery({
    queryKey: ['instagram-account', orgId],
    queryFn: instagramService.get,
    enabled: hasAccess,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['instagram-account', orgId] });
  };

  const conectar = useMutation({
    mutationFn: instagramService.connect,
    onSuccess: (dados) => {
      invalidar();
      setIgUserId('');
      setAccessToken('');
      addToast(
        dados.username ? `Conectado como @${dados.username}.` : 'Conta conectada.',
        'success',
      );
    },
    onError: (erro) => addToast(mensagemDoErro(erro), 'error'),
  });

  const verificar = useMutation({
    mutationFn: instagramService.verify,
    onSuccess: (dados) => {
      invalidar();
      if (dados.status === 'CONNECTED') {
        addToast(
          dados.username ? `Tudo certo — @${dados.username} respondeu.` : 'Credencial válida.',
          'success',
        );
      } else {
        // 200 com status REVOKED: a checagem rodou, o veredito é que o token caiu.
        addToast(`A Meta recusou a credencial: ${dados.lastError}`, 'error');
      }
    },
    onError: (erro) => addToast(mensagemDoErro(erro), 'error'),
  });

  const desconectar = useMutation({
    mutationFn: instagramService.disconnect,
    onSuccess: () => {
      invalidar();
      setConfirmandoDesconexao(false);
      addToast('Conta desconectada. A publicação automática está suspensa.', 'success');
    },
    onError: (erro) => addToast(mensagemDoErro(erro), 'error'),
  });

  if (isSyncingOrg || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando integração...</p>
      </div>
    );
  }

  const revogada = conta?.status === 'REVOKED';

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-1">
        <Link
          to={`/organizations/${orgId}/campaigns`}
          className="text-xs text-zinc-500 hover:text-primary flex items-center gap-1 mb-2 transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar para Campanhas
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-glow flex items-center gap-3">
          <InstagramIcon className="w-7 h-7 text-primary" />
          Instagram
        </h1>
        <p className="text-zinc-500 text-sm">
          Conta usada para publicar automaticamente os posts de{' '}
          <span className="text-zinc-300">{organizacao?.name ?? 'esta organização'}</span>.
        </p>
      </header>

      {conta ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {revogada ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <span className={`font-bold ${revogada ? 'text-red-400' : 'text-emerald-400'}`}>
                    {revogada ? 'Credencial recusada' : 'Conectado'}
                  </span>
                </div>
                {conta.username && <p className="text-lg text-zinc-200">@{conta.username}</p>}
                <p className="text-xs text-zinc-500 font-mono">ID {conta.igUserId}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => verificar.mutate()}
                  disabled={verificar.isPending}
                  className="border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {verificar.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Testar conexão
                </button>
                <button
                  onClick={() => setConfirmandoDesconexao(true)}
                  className="border border-red-500/20 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <Link2Off className="w-4 h-4" />
                  Desconectar
                </button>
              </div>
            </div>

            {revogada && conta.lastError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                <p className="text-sm text-red-300 font-semibold">
                  A publicação automática desta organização está parada.
                </p>
                <p className="text-xs text-red-200/80 font-mono break-words">{conta.lastError}</p>
                <p className="text-xs text-zinc-400">
                  Gere um token novo no Business Manager e reconecte abaixo. Os posts que estavam
                  aguardando saem no ciclo seguinte, sem precisar de nada além disso.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/5 pt-4">
              <div>
                <p className="text-zinc-500 text-xs">Última verificação</p>
                <p className="text-zinc-300">{formatarData(conta.lastVerifiedAt)}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Validade do token</p>
                <p className="text-zinc-300">
                  {conta.tokenExpiresAt ? formatarData(conta.tokenExpiresAt) : 'Não expira'}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        <GlassCard className="p-6 border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-400">Nenhuma conta conectada</p>
              <p className="text-sm text-zinc-400">
                Os posts desta organização continuam sendo aprovados normalmente, mas não vão ao ar
                até que uma conta seja conectada.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {conta ? 'Substituir credencial' : 'Conectar conta'}
          </h2>
          <p className="text-sm text-zinc-500">
            Use um token de System User do Business Manager: ele não expira, diferente do token de
            usuário, que vence em 60 dias.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            conectar.mutate({ igUserId: igUserId.trim(), accessToken: accessToken.trim() });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="igUserId" className="text-sm font-semibold text-zinc-300">
              IG User ID
            </label>
            <input
              id="igUserId"
              value={igUserId}
              onChange={(e) => setIgUserId(e.target.value)}
              placeholder="17841409016921092"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-zinc-600">
              Apenas dígitos. É o identificador da conta profissional, não o @usuário.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="accessToken" className="text-sm font-semibold text-zinc-300">
              Token de acesso
            </label>
            <textarea
              id="accessToken"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              rows={3}
              placeholder="EAA..."
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <p className="text-xs text-zinc-600">
              É gravado criptografado e nunca mais volta para esta tela — para trocar, cole um novo.
            </p>
          </div>

          <button
            type="submit"
            disabled={conectar.isPending || !igUserId.trim() || !accessToken.trim()}
            className="bg-primary text-black px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {conectar.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando com a Meta...
              </>
            ) : (
              <>
                <InstagramIcon className="w-5 h-5" />
                {conta ? 'Substituir credencial' : 'Conectar conta'}
              </>
            )}
          </button>
        </form>
      </GlassCard>

      <ConfirmDialog
        isOpen={confirmandoDesconexao}
        onClose={() => setConfirmandoDesconexao(false)}
        onConfirm={() => desconectar.mutate()}
        isConfirming={desconectar.isPending}
        title="Desconectar Instagram"
        confirmLabel="Desconectar"
        confirmingLabel="Desconectando..."
        description={
          <>
            A credencial de <strong>{organizacao?.name ?? 'esta organização'}</strong> será apagada e{' '}
            <strong>nenhum post desta organização será publicado</strong> até que uma nova conta seja
            conectada. Os posts já publicados não são afetados.
          </>
        }
      />
    </div>
  );
}
