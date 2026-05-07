import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, type UserWithOrgs } from '../api/users-service';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import type { Organization } from '@/features/organizations/types';
import { GlassCard } from '../../../shared/components/glass-card';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Building,
  Plus,
  X,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ChevronRight,
  MoreHorizontal,
  UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateUserModal } from './create-user-modal';
import { LinkOrganizationModal } from './link-organization-modal';
import { ConfirmUnlinkModal } from './confirm-unlink-modal';
import { ConfirmDeleteUserModal } from './confirm-delete-user-modal';
import { useToastStore } from '@/stores/use-toast-store';

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'DESIGNER' | 'CLIENT' | 'INACTIVE'>('DESIGNER');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrgs | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [unlinkData, setUnlinkData] = useState<{ userId: string, organizationId: string, userName: string, orgName: string } | null>(null);
  const [deleteUserData, setDeleteUserData] = useState<{ id: string, name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();



  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['team', activeTab],
    queryFn: () => usersService.getAll(
      activeTab === 'INACTIVE' ? undefined : activeTab,
      activeTab === 'INACTIVE' ? false : true
    )
  });

  const { data: organizations, isLoading: isOrgsLoading } = useQuery({
    queryKey: ['team-organizations'],
    queryFn: () => organizationsService.getAll(),
    enabled: activeTab === 'CLIENT'
  });

  const isLoading = isUsersLoading || (activeTab === 'CLIENT' && isOrgsLoading && !selectedOrg);

  const unlinkMutation = useMutation({
    mutationFn: (data: { userId: string, organizationId: string }) => usersService.unlinkFromOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      addToast('Vínculo removido com sucesso!', 'success');
      setUnlinkData(null);
    },
    onError: () => {
      addToast('Erro ao remover vínculo.', 'error');
    }
  });

  const handleUnlinkRequest = (userId: string, userName: string, orgId: string, orgName: string) => {
    setUnlinkData({ userId, userName, organizationId: orgId, orgName });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['team-organizations'] });
      addToast('Usuário desativado com sucesso!', 'success');
      setDeleteUserData(null);
    },
    onError: () => {
      addToast('Erro ao desativar usuário.', 'error');
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => usersService.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['team-organizations'] });
      addToast('Usuário reativado com sucesso!', 'success');
    },
    onError: () => {
      addToast('Erro ao reativar usuário.', 'error');
    }
  });

  const handleTabChange = (tab: 'DESIGNER' | 'CLIENT' | 'INACTIVE') => {
    setActiveTab(tab);
    setSelectedOrg(null);
  };

  const filteredUsers = (selectedOrg ? selectedOrg.users?.map(u => u.user) : users)?.filter(u =>
    u.role !== 'ADMIN' && (
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) as UserWithOrgs[];

  const unallocatedUsers = activeTab === 'CLIENT' && !selectedOrg
    ? users?.filter(u =>
        u.role === 'CLIENT' &&
        u.organizations?.length === 0 && (
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) as UserWithOrgs[]
    : [];

  const filteredOrganizations = organizations?.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin loader-gradient mb-4" />
        <p>Carregando equipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestão de Equipe
          </h1>
          <p className="text-zinc-500 mt-1">Gerencie usuários, designers, clientes e suas alocações nas organizações.</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary px-5 py-3 rounded-2xl flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Novo Usuário
        </button>
      </header>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex gap-1">
          <button
            onClick={() => handleTabChange('DESIGNER')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'DESIGNER'
              ? 'btn-primary'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
          >
            Designers
          </button>
          <button
            onClick={() => handleTabChange('CLIENT')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'CLIENT'
              ? 'btn-primary'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
          >
            Clientes (Contatos)
          </button>
          <button
            onClick={() => handleTabChange('INACTIVE')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'INACTIVE'
              ? 'bg-red-500/80 text-white'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
          >
            Usuários Desativados
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={`Buscar por nome ou e-mail...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Organization Breadcrumb / Back Button */}
      {activeTab === 'CLIENT' && selectedOrg && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => setSelectedOrg(null)}
            className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Empresas
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-primary" />
            <span className="text-white font-bold">{selectedOrg.name}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <span className="text-zinc-500">Clientes</span>
          </div>
        </motion.div>
      )}

      {/* Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {activeTab === 'CLIENT' && !selectedOrg ? (
            // Organizations Grid + Unallocated Users
            <>
              {unallocatedUsers && unallocatedUsers.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="sm:col-span-2 lg:col-span-3"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                      <div className="h-1 w-6 bg-linear-to-r from-amber-500 to-transparent rounded-full" />
                      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Usuários Sem Alocação</h3>
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold">
                        {unallocatedUsers.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {unallocatedUsers?.map((u) => (
                        <motion.div
                          key={u.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <GlassCard className="p-6 h-full flex flex-col group hover:border-amber-500/30 transition-all border-amber-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                              <Users className="w-32 h-32 -mr-16 -mt-16" />
                            </div>

                            <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
                                  {u.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors">
                                    {u.name || 'Sem nome'}
                                  </h3>
                                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                                    <Mail className="w-3 h-3" />
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-amber-500/10">
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setIsLinkModalOpen(true);
                                }}
                                className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Alocar a Organização
                              </button>
                            </div>
                          </GlassCard>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {filteredOrganizations?.map((org) => (
                <motion.div
                  key={org.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSelectedOrg(org)}
                  className="cursor-pointer"
                >
                  <GlassCard className="p-6 h-full flex flex-col group hover:border-primary/50 transition-all border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Building className="w-32 h-32 -mr-16 -mt-16" />
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center text-primary">
                        <Building className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xl group-hover:text-primary transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-zinc-500 text-xs">
                          {org.users?.filter(m => m.user.role !== 'ADMIN').length || 0} membros vinculados
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto flex justify-end">
                      <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        Ver Clientes
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </>
          ) : (
            // Users Grid (Designers, Inactive, or selected Org clients)
            filteredUsers?.map((u) => (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
              <GlassCard className="p-6 h-full flex flex-col group hover:border-primary/30 transition-all border-white/5">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center text-primary text-xl font-bold">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                        {u.name || 'Sem nome'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <Mail className="w-3 h-3" />
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 relative">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === u.id ? null : u.id);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === u.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden"
                          >
                            {u.isActive ? (
                              <button
                                onClick={() => {
                                  setDeleteUserData({ id: u.id, name: u.name || u.email });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                                Desativar Usuário
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  reactivateMutation.mutate(u.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Reativar Usuário
                              </button>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Building className="w-3 h-3" />
                        Alocações ({u.organizations?.length || 0})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsLinkModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                        title="Vincular a nova organização"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(u.organizations?.length || 0) > 0 ? (
                        u.organizations?.map((org) => (
                          <div
                            key={org.organization.id}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-400 flex items-center gap-1.5 group/tag relative pr-7"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
                            {org.organization.name}
                            <button
                              onClick={() => handleUnlinkRequest(u.id, u.name || '', org.organization.id, org.organization.name)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all opacity-0 group-hover/tag:opacity-100"
                              title="Remover alocação"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Nenhuma organização vinculada</span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {filteredUsers?.length === 0 && (
        <div className="py-20 text-center text-zinc-600">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhum usuário encontrado para esta categoria.</p>
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultRole={activeTab === 'INACTIVE' ? 'DESIGNER' : activeTab}
      />

      {selectedUser && (
        <LinkOrganizationModal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}

      {unlinkData && (
        <ConfirmUnlinkModal
          isOpen={!!unlinkData}
          onClose={() => setUnlinkData(null)}
          onConfirm={() => unlinkMutation.mutate({ userId: unlinkData.userId, organizationId: unlinkData.organizationId })}
          userName={unlinkData.userName}
          orgName={unlinkData.orgName}
          isLoading={unlinkMutation.isPending}
        />
      )}

      {deleteUserData && (
        <ConfirmDeleteUserModal
          isOpen={!!deleteUserData}
          onClose={() => setDeleteUserData(null)}
          onConfirm={() => deleteMutation.mutate(deleteUserData.id)}
          userName={deleteUserData.name}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
