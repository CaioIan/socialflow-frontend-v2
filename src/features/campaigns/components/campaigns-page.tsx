import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrganizationAccess } from '@/shared/hooks/use-organization-access';
import { GlassCard } from '@/shared/components/glass-card';
import { FolderKanban, Plus, Calendar, ArrowLeft, Loader2, Edit2, Trash2, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { campaignsService } from '../api/campaigns-service';
import { CreateCampaignModal } from './create-campaign-modal';
import { TypeToConfirmDialog } from '@/shared/components/type-to-confirm-dialog';
import { SelectionBar } from '@/shared/components/selection-bar';
import { useToastStore } from '@/stores/use-toast-store';
import type { Campaign } from '../api/campaigns-service';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { hasAccess, isLoading: isSyncingOrg } = useOrganizationAccess(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | undefined>(undefined);
  const [campaignPendingDelete, setCampaignPendingDelete] = useState<{ id: string; title: string; postsCount: number } | undefined>(undefined);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(undefined);
  };

  // Busca os detalhes da organização pelo ID da URL
  const { data: activeOrg, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationsService.getById(id!),
    enabled: !!id && hasAccess
  });

  // Busca a lista real de campanhas
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: campaignsService.getAll,
    // Só busca depois que o token aponta para a organização da URL, senão viria
    // a lista da organização anterior.
    enabled: hasAccess,
  });

  const deleteMutation = useMutation({
    mutationFn: campaignsService.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
      addToast('Campanha excluída com sucesso.', 'success');
      setCampaignPendingDelete(undefined);
    },
    onError: () => {
      addToast('Erro ao excluir campanha.', 'error');
      setCampaignPendingDelete(undefined);
    },
  });

  const idsSelecionados = [...selecionados];
  const tudoMarcado =
    campaigns.length > 0 && campaigns.every((c) => selecionados.has(c.id));
  // Quantos posts somem junto — é o número que o operador precisa ver antes.
  const postsAtingidos = campaigns
    .filter((c) => selecionados.has(c.id))
    .reduce((soma, c) => soma + c.postsCount, 0);

  const alternarSelecao = (idCampanha: string) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(idCampanha)) proximo.delete(idCampanha);
      else proximo.add(idCampanha);
      return proximo;
    });
  };

  const sairDaSelecao = () => {
    setModoSelecao(false);
    setSelecionados(new Set());
  };

  const excluirEmMassa = useMutation({
    mutationFn: campaignsService.bulkDelete,
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
      addToast(`${r.quantidade} campanha(s) excluída(s).`, 'success');
      setIsBulkDeleteOpen(false);
      sairDaSelecao();
    },
    onError: () => addToast('Erro ao excluir as campanhas.', 'error'),
  });

  if (isSyncingOrg || isLoadingOrg || isLoadingCampaigns) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando campanhas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link 
            to="/organizations" 
            className="text-xs text-zinc-500 hover:text-primary flex items-center gap-1 mb-2 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar para Organizações
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-glow flex items-center gap-3">
            <span className="text-zinc-500 font-normal shrink-0">Campanhas /</span> 
            <span className="truncate">{activeOrg?.name || 'Empresa'}</span>
          </h1>
          <p className="text-zinc-500 text-sm">Pastas de artes e cronogramas mensais.</p>
        </div>
        
        {/* A conexão do Instagram saiu daqui: é configuração da empresa, e o
            lugar dela é o card da organização, na tela de Organizações. */}
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
              onClick={() => setIsModalOpen(true)}
              className="bg-brand-gradient hover:opacity-90 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Nova Campanha
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign, index) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() =>
              modoSelecao
                ? alternarSelecao(campaign.id)
                : navigate(`/organizations/${id}/campaigns/${campaign.id}/posts`)
            }
          >
            <GlassCard className={`group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden h-full active:scale-[0.98] transition-transform ${modoSelecao && selecionados.has(campaign.id) ? 'ring-2 ring-primary border-primary/40' : ''}`}>
              {modoSelecao && (
                <span className="absolute top-4 left-4 z-20 pointer-events-none">
                  {selecionados.has(campaign.id) ? (
                    <CheckSquare className="w-5 h-5 text-primary drop-shadow-[0_0_6px_oklch(var(--primary)/0.8)]" />
                  ) : (
                    <Square className="w-5 h-5 text-zinc-500" />
                  )}
                </span>
              )}
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(campaign);
                    }}
                    title="Editar Campanha"
                    aria-label="Editar Campanha"
                    className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-black/20 hover:bg-white/10 text-white md:text-zinc-400 md:hover:text-white transition-all backdrop-blur-md shadow-xl border border-white/5 active:scale-90"
                  >
                    <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCampaignPendingDelete({ id: campaign.id, title: campaign.title, postsCount: campaign.postsCount });
                    }}
                    title="Excluir Campanha"
                    aria-label="Excluir Campanha"
                    className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-black/20 hover:bg-red-500/20 text-white md:text-zinc-400 md:hover:text-red-400 transition-all backdrop-blur-md shadow-xl border border-white/5 active:scale-90"
                  >
                    <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 mb-6 min-w-0">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-brand-gradient flex items-center justify-center text-white transition-all shadow-[0_0_15px_oklch(var(--primary)/0.3)]">
                  <FolderKanban className="w-6 h-6" />
                </div>
                {/* O mês é o que distingue uma campanha da outra num painel de
                    cronogramas mensais — por isso grande. Em cinza fechado para
                    pesar como fundo, não competir com o nome. */}
                <span className="text-3xl font-black tracking-tight text-zinc-700 leading-none truncate capitalize select-none">
                  {campaign.referenceMonth && campaign.referenceYear
                    ? new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
                        new Date(2024, campaign.referenceMonth - 1),
                      )
                    : '—'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-glow transition-all">
                {campaign.title}
              </h3>

              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>
                  {campaign.referenceMonth && campaign.referenceYear
                    ? `${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2024, campaign.referenceMonth - 1))} ${campaign.referenceYear}`
                    : 'Sem data definida'}
                </span>
              </div>

            </GlassCard>
          </motion.div>
        ))}

        {campaigns.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
            <FolderKanban className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Nenhuma campanha cadastrada nesta organização.</p>
          </div>
        )}
      </div>

      <CreateCampaignModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingCampaign}
      />

      {/* Campanha não tem desativação: ou fica, ou some do banco junto com tudo
          que está pendurado nela. Por isso exige digitar o nome. */}
      <SelectionBar
        quantidade={idsSelecionados.length}
        substantivo={{ singular: 'campanha selecionada', plural: 'campanhas selecionadas' }}
        tudoMarcado={tudoMarcado}
        onAlternarTudo={() =>
          setSelecionados(tudoMarcado ? new Set() : new Set(campaigns.map((c) => c.id)))
        }
        onSair={sairDaSelecao}
      >
        <button
          type="button"
          onClick={() => setIsBulkDeleteOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/50 text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-2 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>
      </SelectionBar>

      <TypeToConfirmDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => !excluirEmMassa.isPending && setIsBulkDeleteOpen(false)}
        onConfirm={() => excluirEmMassa.mutate(idsSelecionados)}
        title="Excluir campanhas permanentemente?"
        confirmationText={String(idsSelecionados.length)}
        description={
          <>
            <strong className="text-zinc-300">
              {idsSelecionados.length}{' '}
              {idsSelecionados.length === 1 ? 'campanha' : 'campanhas'}
            </strong>
            {postsAtingidos > 0 ? (
              <>
                {' '}e <strong className="text-red-400">
                  {postsAtingidos === 1 ? 'o post vinculado' : `todos os ${postsAtingidos} posts vinculados`}
                </strong>{' '}
                a {idsSelecionados.length === 1 ? 'ela' : 'elas'} (incluindo artes, versões,
                comentários e histórico) {postsAtingidos === 1 ? 'será excluído' : 'serão excluídos'}{' '}
                permanentemente.
              </>
            ) : (
              idsSelecionados.length === 1 ? ' será excluída permanentemente.' : ' serão excluídas permanentemente.'
            )}{' '}
            Esta ação não pode ser desfeita. Digite{' '}
            <strong className="text-zinc-300">{idsSelecionados.length}</strong> para confirmar.
          </>
        }
        confirmLabel="Excluir Permanentemente"
        confirmingLabel="Excluindo..."
        isConfirming={excluirEmMassa.isPending}
      />

      <TypeToConfirmDialog
        isOpen={!!campaignPendingDelete}
        onClose={() => !deleteMutation.isPending && setCampaignPendingDelete(undefined)}
        onConfirm={() => campaignPendingDelete && deleteMutation.mutate(campaignPendingDelete.id)}
        title="Excluir campanha permanentemente?"
        confirmationText={campaignPendingDelete?.title ?? ''}
        description={
          <>
            <strong className="text-zinc-300">{campaignPendingDelete?.title}</strong>
            {campaignPendingDelete && campaignPendingDelete.postsCount > 0 ? (
              <>
                {' '}e <strong className="text-red-400">todos os {campaignPendingDelete.postsCount} posts</strong> vinculados
                a ela (incluindo artes, versões, comentários e histórico) serão excluídos permanentemente.
              </>
            ) : (
              ' será excluída permanentemente.'
            )}{' '}
            Não existe desativação para campanhas e esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir Permanentemente"
        confirmingLabel="Excluindo..."
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}
