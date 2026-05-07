import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/use-auth-store';
import { GlassCard } from '@/shared/components/glass-card';
import { Building2, ArrowRight, Plus, Loader2, Edit2, Ban, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/features/auth/api/auth-service';
import { organizationsService } from '../api/organizations-service';
import { useNavigate } from 'react-router-dom';
import { CreateOrganizationModal } from './create-organization-modal';
import { IntegrationConfigModal } from './integration-config-modal';
import { ConfirmDeactivateOrgModal } from './confirm-deactivate-org-modal';
import { useToastStore } from '@/stores/use-toast-store';
import { Webhook } from 'lucide-react';

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setCurrentOrganization, currentOrganizationId } = useAuthStore();
  const { addToast } = useToastStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<{ id: string, name: string } | undefined>(undefined);

  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [integrationOrg, setIntegrationOrg] = useState<{ id: string, name: string } | undefined>(undefined);

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivatingOrg, setDeactivatingOrg] = useState<{ id: string, name: string } | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const isDesigner = user?.role?.toUpperCase() === 'DESIGNER';
  const isClient = user?.role?.toUpperCase() === 'CLIENT';

  // Busca a lista real de organizações da API
  const { data: organizations = [], isLoading, error } = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: organizationsService.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutos sem mostrar loader ao navegar de volta
  });

  const filteredOrganizations = organizations.filter(org => {
    if (activeTab === 'ACTIVE') return org.isActive === true;
    return org.isActive === false;
  });

  const handleEdit = (org: { id: string, name: string }) => {
    setEditingOrg(org);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingOrg(undefined);
  };

  const handleOpenIntegration = (org: { id: string, name: string }) => {
    setIntegrationOrg(org);
    setIsIntegrationModalOpen(true);
  };

  const handleCloseIntegration = () => {
    setIsIntegrationModalOpen(false);
    setIntegrationOrg(undefined);
  };

  const handleSelectOrganization = (organizationId: string) => {
    // Aguarda o novo token com organizationId ANTES de navegar
    selectMutation.mutate(organizationId, {
      onSuccess: () => {
        // Depois que obtém o novo token, atualiza estado
        setCurrentOrganization(organizationId);
        // E só aí navega
        navigate(`/organizations/${organizationId}/campaigns`, { replace: true });
      },
      onError: () => {
        addToast('Erro ao sincronizar organização com o servidor.', 'error');
      }
    });
  };

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

  const reactivateMutation = useMutation({
    mutationFn: organizationsService.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      addToast('Organização reativada com sucesso!', 'success');
    },
    onError: () => {
      addToast('Erro ao reativar organização.', 'error');
    },
  });

  const selectMutation = useMutation({
    mutationFn: authService.selectOrganization,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin loader-gradient mb-4" />
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Organizações</h1>
          <p className="text-zinc-500">
            {isAdmin && 'Gerencie seus clientes e tenants do SocialFlow.'}
            {isDesigner && 'Visualize e acesse as organizações onde você foi alocado.'}
            {isClient && 'Veja sua organização e gerencie campanhas.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary px-5 py-3 rounded-2xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Organização
          </button>
        )}
      </header>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
              activeTab === 'ACTIVE'
                ? "btn-primary"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            Ativas
          </button>
          <button
            onClick={() => setActiveTab('INACTIVE')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
              activeTab === 'INACTIVE'
                ? "bg-red-500/80 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            Inativas
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrganizations.map((org, index) => {
          const orgId = org.id;
          const isActive = orgId === currentOrganizationId;
          const isLoading = selectMutation.isPending && selectMutation.variables === orgId;

          return (
            <motion.div
              key={orgId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !isLoading && org.isActive && handleSelectOrganization(orgId)}
              className={cn("group", org.isActive ? "cursor-pointer" : "cursor-not-allowed")}
            >
              <GlassCard
                className={`flex flex-col h-full border-t-4 transition-all duration-500 relative overflow-hidden active:scale-[0.98] ${isActive ? 'border-t-primary bg-primary/3' : 'border-t-transparent'
                  } ${isLoading ? 'opacity-75' : ''}`}
              >
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs text-zinc-300 font-medium">Entrando...</p>
                    </div>
                  </div>
                )}
                {/* Botões de Ação Rápida (Admin) */}
                {isAdmin && (
                  <div className={`absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                    {activeTab === 'ACTIVE' && (
                      <>
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
                            handleOpenIntegration({ id: orgId, name: org.name });
                          }}
                          title="Configurar n8n Webhook"
                          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-white/5 hover:bg-white/10 text-white md:text-zinc-400 md:hover:text-white transition-all shadow-xl border border-white/5 active:scale-90"
                        >
                          <Webhook className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                      </>
                    )}

                    {activeTab === 'ACTIVE' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeactivatingOrg({ id: orgId, name: org.name });
                          setIsDeactivateModalOpen(true);
                        }}
                        title="Desativar Organização"
                        className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-white/5 hover:bg-red-500/10 text-white md:text-zinc-400 md:hover:text-red-400 transition-all shadow-xl border border-white/5 active:scale-90"
                      >
                        <Ban className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reactivateMutation.mutate(orgId);
                        }}
                        title="Reativar Organização"
                        className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-black/40 md:bg-white/5 hover:bg-primary/10 text-white md:text-zinc-400 md:hover:text-primary transition-all shadow-xl border border-white/5 active:scale-90"
                      >
                        {reactivateMutation.isPending && reactivateMutation.variables === orgId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-primary/20 text-primary shadow-[0_0_20px_oklch(var(--primary)/0.2)]' : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
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
                      isActive ? "btn-primary" : "bg-white/5 group-hover:bg-primary/20 text-white",
                      !org.isActive && "opacity-50 cursor-not-allowed grayscale",
                      isLoading && "opacity-70 pointer-events-none"
                    )}
                  >
                    {!org.isActive ? (
                      "Organização Inativa"
                    ) : isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Entrando...
                      </>
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

        {filteredOrganizations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/1"
          >
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-zinc-400 mb-2">
              {activeTab === 'ACTIVE' ? 'Nenhuma organização ativa' : 'Nenhuma organização inativa'}
            </h3>
            <p className="text-zinc-600 mb-8 max-w-xs mx-auto text-sm">
              {activeTab === 'ACTIVE'
                ? 'Nenhuma empresa cliente cadastrada para gerenciar campanhas.'
                : 'Não existem organizações desativadas no momento.'}
            </p>
            {isAdmin && activeTab === 'ACTIVE' && (
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

      <IntegrationConfigModal
        isOpen={isIntegrationModalOpen}
        onClose={handleCloseIntegration}
        organizationId={integrationOrg?.id}
        organizationName={integrationOrg?.name}
      />

      <ConfirmDeactivateOrgModal
        isOpen={isDeactivateModalOpen}
        orgName={deactivatingOrg?.name || ''}
        isPending={deleteMutation.isPending}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setDeactivatingOrg(undefined);
        }}
        onConfirm={() => {
          if (deactivatingOrg) {
            deleteMutation.mutate(deactivatingOrg.id, {
              onSuccess: () => {
                setIsDeactivateModalOpen(false);
                setDeactivatingOrg(undefined);
              }
            });
          }
        }}
      />
    </div>
  );
}
