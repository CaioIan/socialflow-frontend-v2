import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { GlassCard } from '@/shared/components/glass-card';
import { FolderKanban, Plus, Calendar, ArrowLeft, Loader2, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { campaignsService } from '../api/campaigns-service';
import { CreateCampaignModal } from './create-campaign-modal';
import { useToastStore } from '@/stores/use-toast-store';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(undefined);
  
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const handleEdit = (campaign: any) => {
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
    enabled: !!id
  });

  // Busca a lista real de campanhas
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: campaignsService.getAll,
  });

  const deactivateMutation = useMutation({
    mutationFn: campaignsService.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
      addToast('Campanha arquivada com sucesso!', 'success');
    },
    onError: () => {
      addToast('Erro ao arquivar campanha.', 'error');
    },
  });

  if (isLoadingOrg || isLoadingCampaigns) {
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
        
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign, index) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(`/organizations/${id}/campaigns/${campaign.id}/posts`)}
          >
            <GlassCard className="group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden h-full active:scale-[0.98] transition-transform">
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(campaign);
                    }}
                    className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-black/20 hover:bg-white/10 text-white md:text-zinc-400 md:hover:text-white transition-all backdrop-blur-md shadow-xl border border-white/5 active:scale-90"
                  >
                    <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm('Deseja realmente arquivar esta campanha?')) {
                        deactivateMutation.mutate(campaign.id);
                      }
                    }}
                    className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-black/20 hover:bg-red-500/20 text-white md:text-zinc-400 md:hover:text-red-400 transition-all backdrop-blur-md shadow-xl border border-white/5 active:scale-90"
                  >
                    <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block">Status</span>
                  <span className={`text-xs font-bold ${campaign.isActive ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    {campaign.isActive ? 'Ativa' : 'Arquivada'}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-glow transition-all">
                {campaign.title}
              </h3>
              
              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
                <Calendar className="w-4 h-4" />
                <span>
                  {campaign.referenceMonth && campaign.referenceYear 
                    ? `${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2024, campaign.referenceMonth - 1))} ${campaign.referenceYear}`
                    : 'Sem data definida'}
                </span>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Clique para abrir posts</span>
                <div className="w-6 h-6 rounded-full border border-zinc-900 bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                  SF
                </div>
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
    </div>
  );
}
