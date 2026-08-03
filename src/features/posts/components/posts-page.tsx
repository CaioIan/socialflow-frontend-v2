import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrganizationAccess } from '@/shared/hooks/use-organization-access';
import { GlassCard } from '@/shared/components/glass-card';
import {
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Send,
  Loader2,
  FileUp,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
  Clock3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsService } from '@/features/campaigns/api/campaigns-service';
import { postsService } from '../api/posts-service';
import { useToastStore } from '@/stores/use-toast-store';
import { getApiErrorMessage } from '@/api/api-error';
import { ROTULO_DO_STATUS } from '../lib/post-status';
import { CreatePostModal } from './create-post-modal';
import { BulkRescheduleModal } from './bulk-reschedule-modal';
import { SelectionBar } from '@/shared/components/selection-bar';
import { TypeToConfirmDialog } from '@/shared/components/type-to-confirm-dialog';
import { ImportPostsModal } from './import-posts-modal';
import { EditPostModal } from './edit-post-modal';
import { DeletePostModal } from './delete-post-modal';
import { UploadVersionModal } from './upload-version-modal';
import { PostActionsMenu } from './post-actions-menu';
import { Upload } from 'lucide-react';

type TabType = 'pending' | 'approved' | 'published' | 'failed';

export default function PostsPage() {
  const { orgId, id: campaignId } = useParams<{ orgId: string, id: string }>();
  const { user } = useAuthStore();
  const { hasAccess, isLoading: isSyncingOrg } = useOrganizationAccess(orgId);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isDesigner = role === 'DESIGNER';
  const isClient = role === 'CLIENT';

  // Detalhes da Campanha
  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignsService.getAll().then(res => res.find(c => c.id === campaignId)),
    enabled: !!campaignId && hasAccess
  });

  // Lista de Posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', campaignId],
    queryFn: () => postsService.getByCampaign(campaignId!),
    enabled: !!campaignId && hasAccess
  });

  // Filtrar posts por status - ambos mantêm ordem cronológica
  const pendingPosts = posts.filter(p => p.status === 'PENDING' || p.status === 'ALTERATION_REQUESTED');
  const approvedPosts = posts.filter(p => p.status === 'APPROVED');
  // PUBLISHED sai da aba de aprovados: já passou do horário agendado.
  const publishedPosts = posts.filter(p => p.status === 'PUBLISHED');
  // FAILED tem aba própria: é o único estado que exige alguém agir.
  const failedPosts = posts.filter(p => p.status === 'FAILED');
  const displayedPosts =
    activeTab === 'pending' ? pendingPosts
    : activeTab === 'approved' ? approvedPosts
    : activeTab === 'published' ? publishedPosts
    : failedPosts;

  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const idsSelecionados = [...selecionados];
  // Só faz sentido selecionar o que está à vista: a barra age sobre a aba atual.
  const selecionaveis = displayedPosts.map((p) => p.id);
  const tudoMarcado =
    selecionaveis.length > 0 && selecionaveis.every((id) => selecionados.has(id));

  const alternarSelecao = (id: string) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const sairDaSelecao = () => {
    setModoSelecao(false);
    setSelecionados(new Set());
  };

  const aposAcaoEmMassa = (mensagem: string) => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    addToast(mensagem, 'success');
    sairDaSelecao();
  };

  const excluirEmMassa = useMutation({
    mutationFn: postsService.bulkDelete,
    onSuccess: (r) => {
      setIsBulkDeleteOpen(false);
      aposAcaoEmMassa(`${r.quantidade} post(s) excluídos.`);
    },
    onError: (erro) => addToast(getApiErrorMessage(erro, 'Erro ao excluir os posts.'), 'error'),
  });

  const reagendarEmMassa = useMutation({
    mutationFn: postsService.bulkReschedule,
    onSuccess: (r) => {
      setIsRescheduleOpen(false);
      aposAcaoEmMassa(`Horário alterado em ${r.quantidade} post(s).`);
    },
    onError: (erro) => addToast(getApiErrorMessage(erro, 'Erro ao alterar o horário.'), 'error'),
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: ROTULO_DO_STATUS.APPROVED, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 };
      case 'PUBLISHED':
        return { label: ROTULO_DO_STATUS.PUBLISHED, color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Send };
      case 'FAILED':
        return { label: ROTULO_DO_STATUS.FAILED, color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle };
      case 'ALTERATION_REQUESTED':
        return { label: ROTULO_DO_STATUS.ALTERATION_REQUESTED, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertCircle };
      default:
        return { label: ROTULO_DO_STATUS.PENDING, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock };
    }
  };

  /**
   * Cada aba tem um estado vazio próprio. Antes só existiam dois textos, e
   * "Publicados" herdava o de aprovação — dizia "Nenhum post aprovado ainda"
   * numa tela que não tem nada a ver com aprovação.
   */
  const getEmptyState = () => {
    switch (activeTab) {
      case 'published':
        return {
          icon: Send,
          color: 'text-violet-700',
          title: 'Nenhum post publicado ainda',
          description:
            'Quando um post aprovado chegar na data agendada, ele vai para o Instagram e aparece aqui com o link.',
        };

      case 'failed':
        return {
          icon: AlertTriangle,
          color: 'text-red-800',
          title: 'Nenhuma falha por aqui',
          description:
            'Se algum post não conseguir ir ao ar, ele aparece nesta aba com o motivo e o que fazer.',
        };

      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-700',
          title: 'Nenhum post aprovado ainda',
          description: isClient
            ? 'Os posts que você aprovar ficam aqui até a data de publicação.'
            : 'Os posts aprovados ficam aqui até chegar a data agendada.',
        };

      default:
        if (posts.length > 0) {
          return {
            icon: Clock,
            color: 'text-blue-700',
            title: 'Tudo em dia por aqui',
            description: isClient
              ? 'Nenhum post aguardando sua aprovação no momento.'
              : 'Nenhum post aguardando revisão no momento.',
          };
        }

        return {
          icon: Clock,
          color: 'text-blue-700',
          title: 'Nenhum post agendado',
          description: isAdmin
            ? 'Comece agendando o primeiro post deste cronograma.'
            : isDesigner
              ? 'Assim que o cronograma for cadastrado, os posts aparecem aqui.'
              : 'Assim que houver post para aprovar, ele aparece aqui.',
        };
    }
  };

  if (isSyncingOrg || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link
            to={`/organizations/${orgId}/campaigns`}
            className="text-xs text-zinc-500 hover:text-primary flex items-center gap-1 mb-2 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar para Campanhas
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-glow flex items-center gap-3">
            {campaign?.title || 'Campanha'}
          </h1>
          <p className="text-zinc-500 text-sm">Cronograma de postagens e artes.</p>
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => (modoSelecao ? sairDaSelecao() : setModoSelecao(true))}
              className={`px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto border ${modoSelecao
                ? 'border-primary/50 bg-primary/15 text-white'
                : 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
            >
              <CheckSquare className="w-5 h-5" />
              {modoSelecao ? 'Cancelar seleção' : 'Selecionar'}
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <FileUp className="w-5 h-5" />
              Importar Posts
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-brand-gradient hover:opacity-90 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Novo Post
            </button>
          </div>
        )}
      </header>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-white/5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-semibold text-sm transition-all relative rounded-t-lg shrink-0 ${activeTab === 'pending'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-blue-500/5 text-blue-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Pendentes</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${activeTab === 'pending'
                ? 'bg-blue-500/30 text-blue-200'
                : 'bg-blue-500/10 text-blue-300'
              }`}>
              {pendingPosts.length}
            </span>
          </div>
          {activeTab === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-3 font-semibold text-sm transition-all relative rounded-t-lg shrink-0 ${activeTab === 'approved'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-emerald-500/5 text-emerald-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Aprovados</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${activeTab === 'approved'
                ? 'bg-emerald-500/30 text-emerald-200'
                : 'bg-emerald-500/10 text-emerald-300'
              }`}>
              {approvedPosts.length}
            </span>
          </div>
          {activeTab === 'approved' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400" />
          )}        </button>

        <button
          onClick={() => setActiveTab('published')}
          className={`px-4 py-3 font-semibold text-sm transition-all relative rounded-t-lg shrink-0 ${activeTab === 'published'
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-violet-500/5 text-violet-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span>Publicados</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${activeTab === 'published'
                ? 'bg-violet-500/30 text-violet-200'
                : 'bg-violet-500/10 text-violet-300'
              }`}>
              {publishedPosts.length}
            </span>
          </div>
          {activeTab === 'published' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-400" />
          )}
        </button>

        {/* Só aparece quando há falha: uma aba vazia e permanente vira ruído. */}
        {failedPosts.length > 0 && (
          <button
            onClick={() => setActiveTab('failed')}
            className={`px-4 py-3 font-semibold text-sm transition-all relative rounded-t-lg shrink-0 ${activeTab === 'failed'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-red-500/5 text-red-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Falhas</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${activeTab === 'failed'
                  ? 'bg-red-500/30 text-red-200'
                  : 'bg-red-500/10 text-red-300'
                }`}>
                {failedPosts.length}
              </span>
            </div>
            {activeTab === 'failed' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-400" />
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {displayedPosts.map((post, index) => {
          const status = getStatusConfig(post.status);
          const Icon = status.icon;

          // Buscar o asset mais recente de cada tipo — posts só de Stories (sem Feed)
          // precisam cair pra capa de Stories, senão o card fica sem prévia nenhuma.
          const feedAsset = post.assets?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(a => a.assetType === 'FEED');
          const storiesAsset = post.assets?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(a => a.assetType === 'STORIES');
          const previewUrl =
            post.currentVersion?.feedUrls?.[0] ||
            feedAsset?.cloudinaryUrl ||
            post.currentVersion?.storiesUrl ||
            storiesAsset?.cloudinaryUrl ||
            null;

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Link
                to={`/organizations/${orgId}/campaigns/${campaignId}/posts/${post.id}`}
                onClick={(e) => {
                  // Em modo de seleção o card marca em vez de navegar.
                  if (!modoSelecao) return;
                  e.preventDefault();
                  alternarSelecao(post.id);
                }}
                aria-pressed={modoSelecao ? selecionados.has(post.id) : undefined}
                className="block h-full group relative"
              >
                {modoSelecao && (
                  <span className="absolute top-3 left-3 z-20 pointer-events-none">
                    {selecionados.has(post.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary drop-shadow-[0_0_6px_oklch(var(--primary)/0.8)]" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-500" />
                    )}
                  </span>
                )}
                <GlassCard className={`hover:border-white/20 transition-all flex flex-col h-full active:scale-[0.98] transition-transform ${modoSelecao && selecionados.has(post.id) ? 'ring-2 ring-primary border-primary/40' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                        <Icon className="w-3 h-3" />
                        {status.label}
                      </div>
                      {post.currentVersion?.versionNumber && (
                        <div className="px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-[9px] font-black text-primary uppercase">
                          v{post.currentVersion.versionNumber}
                        </div>
                      )}
                    </div>
                    <div
                      onClick={(e) => e.preventDefault()} // Impede o link do card de disparar ao clicar no menu
                      className="relative z-20"
                    >
                      <PostActionsMenu
                        postId={post.id}
                        isAdmin={isAdmin}
                        onEdit={(postId) => {
                          setSelectedPostId(postId);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={(postId) => {
                          setSelectedPostId(postId);
                          setIsDeleteModalOpen(true);
                        }}
                      />
                    </div>
                  </div>

                  {/* Continua valendo depois de publicado: quem aprovou não muda. */}
                  {(post.status === 'APPROVED' || post.status === 'PUBLISHED') && post.statusHistory && (
                    (() => {
                      const approval = post.statusHistory.find(h => h.toStatus === 'APPROVED');
                      return approval ? (
                        <p className="text-[8px] text-zinc-500 -mt-2 mb-3">
                          Aprovado por: <span className="text-zinc-400 font-semibold">{approval.changedByUser.name || approval.changedByUser.email}</span>
                        </p>
                      ) : null;
                    })()
                  )}

                  {/* O motivo da falha vem da Meta e é o que diz o que corrigir. */}
                  {post.status === 'FAILED' && post.publicationLog?.lastError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3">
                      <p className="text-[9px] text-red-300 leading-snug break-words">
                        {post.publicationLog.lastError}
                      </p>
                      <p className="text-[8px] text-zinc-500 mt-1">
                        Reenvie a arte para o post voltar à fila de publicação.
                      </p>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    {/* Container da Imagem: Altura adaptável com min-h para quem não tem imagem */}
                    <div className="relative w-full rounded-xl overflow-hidden bg-black/20 border border-white/5 mb-4 group-hover:border-primary/20 transition-all min-h-[120px] sm:min-h-[250px] flex flex-col items-center justify-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          className="w-full h-auto max-h-[200px] sm:max-h-[400px] object-contain transition-transform duration-500 group-hover:scale-105"
                          alt="Preview do Post"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                          <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-50 text-center px-2">Sem Arte</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-white">
                      {/* Data à esquerda */}
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/5 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none">
                          {new Date(post.scheduledFor).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-lg font-bold leading-none mt-0.5">
                          {new Date(post.scheduledFor).getDate()}
                        </span>
                      </div>

                      {/* Horário ao centro */}
                      <div className="flex flex-1 justify-center">
                        <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg">
                          {new Date(post.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Ações à direita */}
                      <div className="flex gap-2 shrink-0">
                        {(isAdmin || isDesigner) && (!post.currentVersionId || post.status === 'ALTERATION_REQUESTED') && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPostId(post.id);
                              setIsUploadModalOpen(true);
                            }}
                            className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 text-white transition-all bg-brand-gradient hover:opacity-90 shadow-[0_0_15px_oklch(var(--primary)/0.3)] rounded-xl relative z-20"
                            title={post.currentVersionId ? 'Nova Versão' : 'Upload'}
                          >
                            <Upload className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                          </button>
                        )}
                        {(isAdmin || isDesigner || isClient) && post.currentVersionId && (
                          <div
                            className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 text-emerald-400 hover:text-white transition-all bg-emerald-500/10 hover:bg-emerald-500 rounded-xl"
                            title="Abrir Preview"
                          >
                            <ImageIcon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}

        {displayedPosts.length === 0 && (() => {
          const vazio = getEmptyState();
          const IconeVazio = vazio.icon;

          return (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <IconeVazio className={`w-10 h-10 ${vazio.color}`} />
            </div>
            <h3 className="text-xl font-bold text-zinc-400 mb-2">{vazio.title}</h3>
            <p className="text-zinc-600 mb-8 max-w-xs mx-auto text-sm text-balance">
              {vazio.description}
            </p>
            {activeTab === 'pending' && posts.length === 0 && isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors font-bold"
              >
                <Plus className="w-4 h-4" />
                Agendar Primeiro Post
              </button>
            )}
          </div>
          );
        })()}
      </div>

      <SelectionBar
        quantidade={idsSelecionados.length}
        substantivo={{ singular: 'post selecionado', plural: 'posts selecionados' }}
        tudoMarcado={tudoMarcado}
        onAlternarTudo={() =>
          setSelecionados(tudoMarcado ? new Set() : new Set(selecionaveis))
        }
        onSair={sairDaSelecao}
      >
        <button
          type="button"
          onClick={() => setIsRescheduleOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-sm font-bold flex items-center gap-2 transition-all"
        >
          <Clock3 className="w-4 h-4" />
          Alterar horário
        </button>
        <button
          type="button"
          onClick={() => setIsBulkDeleteOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/50 text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-2 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>
      </SelectionBar>

      <BulkRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => !reagendarEmMassa.isPending && setIsRescheduleOpen(false)}
        onConfirm={(hora, minuto) =>
          reagendarEmMassa.mutate({ ids: idsSelecionados, hora, minuto })
        }
        quantidade={idsSelecionados.length}
        isConfirming={reagendarEmMassa.isPending}
      />

      {/* Digitar a quantidade: e a unica acao da tela que apaga varios registros
          de uma vez, sem volta. */}
      <TypeToConfirmDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => !excluirEmMassa.isPending && setIsBulkDeleteOpen(false)}
        onConfirm={() => excluirEmMassa.mutate(idsSelecionados)}
        title="Excluir posts permanentemente?"
        confirmationText={String(idsSelecionados.length)}
        description={
          <>
            <strong className="text-zinc-300">
              {idsSelecionados.length} {idsSelecionados.length === 1 ? 'post' : 'posts'}
            </strong>{' '}
            e tudo que está preso a eles — artes, versões, comentários e histórico —
            serão excluídos permanentemente. Esta ação não pode ser desfeita.
            {' '}Digite <strong className="text-zinc-300">{idsSelecionados.length}</strong> para confirmar.
          </>
        }
        confirmLabel="Excluir Permanentemente"
        confirmingLabel="Excluindo..."
        isConfirming={excluirEmMassa.isPending}
      />

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        campaignId={campaignId!}
      />

      <ImportPostsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        campaignId={campaignId!}
      />

      {selectedPostId && (
        <>
          <EditPostModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPostId(null);
            }}
            postId={selectedPostId}
            campaignId={campaignId!}
          />

          <DeletePostModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedPostId(null);
            }}
            postId={selectedPostId}
            campaignId={campaignId!}
            orgId={orgId}
          />

          <UploadVersionModal
            isOpen={isUploadModalOpen}
            onClose={() => {
              setIsUploadModalOpen(false);
              setSelectedPostId(null);
            }}
            postId={selectedPostId}
            campaignId={campaignId!}
          />
        </>
      )}
    </div>
  );
}