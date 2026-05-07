import { motion } from 'framer-motion';
import { Building2, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { authService } from '../api/auth-service';
import { useMutation } from '@tanstack/react-query';
import { GlassCard } from '@/shared/components/glass-card';

export function OrganizationSelector() {
  const { organizations, logout, setCurrentOrganization } = useAuthStore();

  const selectMutation = useMutation({
    mutationFn: authService.selectOrganization,
    onSuccess: (_, organizationId) => {
      setCurrentOrganization(organizationId);
    },
  });

  const handleSelect = (id: string) => {
    selectMutation.mutate(id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0a0a0a]/90 backdrop-blur-xl">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-glow mb-3">Selecione uma Empresa</h1>
          <p className="text-zinc-500">Sua conta tem acesso a múltiplas organizações. Escolha qual deseja carregar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org, index) => (
            <motion.div
              key={org.organizationId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => handleSelect(org.organizationId)}
                disabled={selectMutation.isPending}
                className="w-full text-left group"
              >
                <GlassCard className={`flex items-center gap-4 hover:border-primary/50 transition-all p-5 relative ${selectMutation.isPending && selectMutation.variables === org.organizationId ? 'opacity-75' : ''}`}>
                  {/* Loading Overlay */}
                  {selectMutation.isPending && selectMutation.variables === org.organizationId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 rounded-xl">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                    <Building2 className="w-6 h-6 text-zinc-400 group-hover:text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-white">{org.name}</h3>
                    <p className="text-sm text-zinc-500 truncate lowercase">@{org.slug}</p>
                  </div>

                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                    {selectMutation.isPending && selectMutation.variables === org.organizationId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                </GlassCard>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
