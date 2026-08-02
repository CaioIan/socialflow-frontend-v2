import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/use-auth-store';
import { GlassCard } from '@/shared/components/glass-card';
import { InstagramIcon } from '@/shared/components/icons/instagram-icon';
import { Building2, ArrowRight, Plus, Loader2, Edit2, PowerOff, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/features/auth/api/auth-service';
import { organizationsService } from '../api/organizations-service';
import { Link, useNavigate } from 'react-router-dom';
import { CreateOrganizationModal } from './create-organization-modal';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { useToastStore } from '@/stores/use-toast-store';

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setCurrentOrganization, currentOrganizationId } = useAuthStore();
  const { addToast } = useToastStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<{ id: string, name: string } | undefined>(undefined);
  const [orgPendingDelete, setOrgPendingDelete] = useState<{ id: string, name: string } | undefined>(undefined);

  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isDesigner = role === 'DESIGNER';
  const isClient = role === 'CLIENT';

  // Busca a lista real de organizações da API
  // O ADMIN precisa ver as desativadas: é aqui que elas voltam. Para os demais
  // papéis a API ignora o parâmetro e devolve só as organizações deles.
  const { data: organizations = [], isLoading, error } = useQuery({
    queryKey: ['organizations', user?.id, 'com-inativas'],
    queryFn: () => organizationsService.getAll(true),
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
    mutationFn: organizationsService.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      addToast('Organização desativada. Quem só trabalhava nela também saiu.', 'success');
      setOrgPendingDelete(undefined);
    },
    onError: () => {
      addToast('Erro ao desativar organização.', 'error');
      setOrgPendingDelete(undefined);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: organizationsService.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      addToast('Organização reativada. Quem caiu junto com ela voltou.', 'success');
    },
    onError: () => addToast('Erro ao reativar organização.', 'error'),
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
          <p className="text-zinc-500">
            {isAdmin && "Gerencie seus clientes e tenants do SocialFlow."}
            {isDesigner && "Selecione uma empresa para visualizar suas pautas e demandas."}
            {isClient && "Selecione sua empresa para acompanhar o cronograma de posts."}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-gradient hover:opacity-90 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nova Organização
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org, index) => {
          const orgId = org.id;
          // `selecionada` é a organização em uso agora; `desativada` é o estado
          // dela no sistema. Eram os dois chamados de isActive, o que confundia.
          const selecionada = orgId === currentOrganizationId;
          const desativada = !org.isActive;

          return (
            <motion.div
              key={orgId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                // Entrar numa organização desativada levaria a telas vazias:
                // ela existe, mas está fora do ar.
                if (desativada || selectMutation.isPending) return;
                selectMutation.mutate(orgId);
              }}
              className={desativada ? 'group' : 'cursor-pointer group'}
            >
              <GlassCard
                className={`flex flex-col h-full border-t-4 transition-all duration-500 relative overflow-hidden ${desativada
                  ? 'border-t-zinc-700 opacity-60'
                  : `active:scale-[0.98] ${selecionada ? 'border-t-primary bg-primary/[0.03]' : 'border-t-transparent'}`
                  }`}
              >
                {/* Botões de Ação Rápida (Admin) */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    {desativada ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reactivateMutation.mutate(orgId);
                        }}
                        disabled={reactivateMutation.isPending}
                        className="flex items-center gap-2 px-3 h-9 rounded-xl bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reativar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit({ id: orgId, name: org.name });
                          }}
                          title="Editar Organização"
                          aria-label="Editar Organização"
                          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-brand-gradient text-white transition-all shadow-[0_5px_25px_oklch(var(--primary)/0.6)] active:scale-90 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrgPendingDelete({ id: orgId, name: org.name });
                          }}
                          title="Desativar Organização"
                          aria-label="Desativar Organização"
                          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-xl bg-brand-gradient text-white transition-all shadow-[0_5px_25px_oklch(var(--primary)/0.6)] active:scale-90 cursor-pointer"
                        >
                          <PowerOff className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${desativada
                    ? 'bg-white/5 text-zinc-600'
                    : selecionada ? 'bg-brand-gradient text-white shadow-[0_0_20px_oklch(var(--primary)/0.3)]' : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                    }`}>
                    <Building2 className="w-7 h-7" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white group-hover:text-glow transition-all">{org.name}</h3>
                    {desativada && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                        Desativada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mb-4 lowercase font-mono">@{org.slug}</p>

                  {/* Conectar o Instagram é configuração da empresa, então mora
                      aqui — antes só existia dentro da tela de campanhas, onde
                      ninguém procuraria por isso. */}
                  {isAdmin && (
                    <Link
                      to={`/organizations/${orgId}/instagram`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-white/5 bg-black/20 hover:bg-black/40 hover:border-white/10 transition-colors group/ig"
                    >
                      <InstagramIcon className="w-4 h-4 shrink-0 text-zinc-400 group-hover/ig:text-white transition-colors" />
                      {org.instagram === null ? (
                        <span className="text-xs text-zinc-500">Instagram não conectado</span>
                      ) : org.instagram.status === 'REVOKED' ? (
                        <span className="text-xs text-red-400 font-semibold">Credencial recusada</span>
                      ) : (
                        <span className="text-xs text-zinc-300 truncate">
                          {org.instagram.username ? `@${org.instagram.username}` : 'Conectado'}
                        </span>
                      )}
                      <span
                        className={`ml-auto w-2 h-2 rounded-full shrink-0 ${org.instagram === null
                          ? 'bg-zinc-600'
                          : org.instagram.status === 'REVOKED' ? 'bg-red-400' : 'bg-emerald-400'
                          }`}
                      />
                    </Link>
                  )}
                </div>

                <div className="mt-8">
                  <div
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all",
                      desativada
                        ? "bg-white/[0.03] text-zinc-600"
                        : selecionada ? "bg-brand-gradient text-white shadow-[0_0_20px_oklch(var(--primary)/0.4)]" : "bg-white/5 group-hover:bg-brand-gradient hover:text-white"
                    )}
                  >
                    {desativada ? (
                      'Fora do ar — reative para acessar'
                    ) : selectMutation.isPending && selectMutation.variables === orgId ? (
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

      <ConfirmDialog
        isOpen={!!orgPendingDelete}
        onClose={() => !deleteMutation.isPending && setOrgPendingDelete(undefined)}
        onConfirm={() => orgPendingDelete && deleteMutation.mutate(orgPendingDelete.id)}
        title="Desativar organização?"
        description={
          <>
            <strong className="text-zinc-300">{orgPendingDelete?.name}</strong> deixará de aparecer na lista
            e a publicação automática dela para.
            {' '}
            {/* A cascata é a parte que surpreende: quem trabalha só nesta empresa
                perde o acesso junto. Avisar depois, pelo toast, é tarde. */}
            Cada usuário que trabalha <strong className="text-zinc-300">somente nesta organização</strong> também
            será desativado; quem atende outras empresas continua ativo e só deixa de ver esta.
            {' '}
            Essa ação pode ser revertida depois reativando a organização.
          </>
        }
        confirmLabel="Confirmar Desativação"
        confirmingLabel="Desativando..."
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}
