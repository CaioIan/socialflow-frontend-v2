import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/use-auth-store';
import { GlassCard } from '@/shared/components/glass-card';
import { Building2, ArrowRight, Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/features/auth/api/auth-service';
import { organizationsService } from '../api/organizations-service';
import { useNavigate } from 'react-router-dom';
import { CreateOrganizationModal } from './create-organization-modal';
import { useToastStore } from '@/stores/use-toast-store';

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setCurrentOrganization, currentOrganizationId } = useAuthStore();
  const { addToast } = useToastStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<{ id: string, name: string } | undefined>(undefined);

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Busca a lista real de organizações da API
  const { data: organizations = [], isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsService.getAll
  });

  const handleEdit = (org: { id: string, name: string }) => {
    setEditingOrg(org);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingOrg(undefined);
  };

  const selectMutation = useMutation({
    mutationFn: authService.selectOrganization,
    onSuccess: (_, organizationId) => {
      setCurrentOrganization(organizationId);
      addToast('Organização selecionada!', 'success');
      navigate(`/organizations/${organizationId}/campaigns`);
    },
    onError: () => {
      addToast('Erro ao selecionar organização.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: organizationsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      addToast('Organização desativada com sucesso!', 'success');
    },
    onError: () => {
      addToast('Erro ao desativar organização.', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando organizações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-400 font-medium">
        <p>Erro ao carregar organizações. Verifique o backend.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-glow">Organizações</h1>
          <p className="text-zinc-500">Gerencie seus clientes e tenants do SocialFlow.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nova Organização
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org, index) => {
          const orgId = org.id; 
          const isActive = orgId === currentOrganizationId;
          
          return (
            <motion.div
              key={orgId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !selectMutation.isPending && selectMutation.mutate(orgId)}
              className="cursor-pointer group"
            >
              <GlassCard 
                className={`flex flex-col h-full border-t-4 transition-all duration-500 relative overflow-hidden active:scale-[0.98] ${
                  isActive ? 'border-t-primary bg-primary/[0.03]' : 'border-t-transparent'
                }`}
              >
                {/* Botões de Ação Rápida (Admin) */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit({ id: orgId, name: org.name });
                      }}
                      className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-white/5 hover:bg-white/10 text-white md:text-zinc-400 md:hover:text-white transition-all shadow-xl border border-white/5 active:scale-90"
                    >
                      <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm('Deseja realmente desativar esta organização?')) {
                          deleteMutation.mutate(orgId);
                        }
                      }}
                      className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-white/5 hover:bg-red-500/10 text-white md:text-zinc-400 md:hover:text-red-400 transition-all shadow-xl border border-white/5 active:scale-90"
                    >
                      <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary/20 text-primary shadow-[0_0_20px_oklch(var(--primary)/0.2)]' : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    <Building2 className="w-7 h-7" />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-glow transition-all">{org.name}</h3>
                  <p className="text-sm text-zinc-500 mb-6 lowercase font-mono">@{org.slug}</p>

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                      SaaS Active
                    </div>
                    {isActive && (
                      <span className="text-primary font-bold">Selecionada</span>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <div
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all",
                      isActive ? "bg-primary text-white shadow-[0_0_20px_oklch(var(--primary)/0.4)]" : "bg-white/5 group-hover:bg-primary/20 text-white"
                    )}
                  >
                    {selectMutation.isPending && selectMutation.variables === orgId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Entrar na Organização
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {organizations.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]"
          >
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-zinc-400 mb-2">Nenhuma organização</h3>
            <p className="text-zinc-600 mb-8 max-w-xs mx-auto text-sm">Nenhuma empresa cliente cadastrada para gerenciar campanhas.</p>
            {isAdmin && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors font-bold"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Agora
              </button>
            )}
          </motion.div>
        )}
      </div>

      <CreateOrganizationModal 
        isOpen={isCreateModalOpen} 
        onClose={handleCloseModal} 
        initialData={editingOrg}
      />
    </div>
  );
}
