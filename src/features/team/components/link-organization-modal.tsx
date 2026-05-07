import * as React from 'react';
import { useState } from 'react';
import { X, Building, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/shared/components/glass-card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService, type UserWithOrgs } from '../api/users-service';
import { organizationsService } from '@/features/organizations/api/organizations-service';
import { useToastStore } from '@/stores/use-toast-store';

interface LinkOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithOrgs;
}

export function LinkOrganizationModal({ isOpen, onClose, user }: LinkOrganizationModalProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const { data: organizations, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsService.getAll(),
    enabled: isOpen
  });

  const linkMutation = useMutation({
    mutationFn: (orgId: string) => 
      usersService.linkToOrganization({
        userId: user.id,
        organizationId: orgId,
        role: user.role
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      addToast('Usuário vinculado com sucesso!', 'success');
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao vincular usuário';
      addToast(message, 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    linkMutation.mutate(selectedOrgId);
  };

  // Filtrar organizações que o usuário já pertence
  const availableOrgs = organizations?.filter(
    org => !user.organizations.some(uo => uo.organization.id === org.id)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md z-10"
          >
            <GlassCard className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-primary">
                  <Building className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-white">Vincular a Cliente</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-8">
                <p className="text-zinc-400 text-sm">
                  Selecione uma organização para vincular <span className="text-white font-bold">{user.name}</span>. 
                  Isso dará permissão de acesso aos posts e campanhas desta organização.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Organização (Cliente)</label>
                  {isLoadingOrgs ? (
                    <div className="flex items-center gap-2 text-zinc-500 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando organizações...
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedOrgId}
                      onChange={e => setSelectedOrgId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900">Selecione uma organização...</option>
                      {availableOrgs?.map(org => (
                        <option key={org.id} value={org.id} className="bg-zinc-900">{org.name}</option>
                      ))}
                    </select>
                  )}
                  {availableOrgs?.length === 0 && !isLoadingOrgs && (
                    <p className="text-[10px] text-amber-500 mt-2 italic">
                      Este usuário já está vinculado a todas as organizações disponíveis.
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedOrgId || linkMutation.isPending}
                    className="flex-2 btn-primary py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {linkMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vincular Agora'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
