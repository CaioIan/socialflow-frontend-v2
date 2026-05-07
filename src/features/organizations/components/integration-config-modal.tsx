import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Webhook } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { organizationsService } from '../api/organizations-service';
import { useToastStore } from '@/stores/use-toast-store';

interface IntegrationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  organizationName?: string;
}

interface IntegrationFormData {
  n8nWebhookUrl: string;
}

export function IntegrationConfigModal({ isOpen, onClose, organizationId, organizationName }: IntegrationConfigModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<IntegrationFormData>();

  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['integration-config', organizationId],
    queryFn: () => organizationsService.getIntegrationConfig(organizationId!),
    enabled: isOpen && !!organizationId,
    retry: false, // Don't retry if it returns 404 (not configured yet)
  });

  useEffect(() => {
    if (config?.n8nWebhookUrl) {
      setValue('n8nWebhookUrl', config.n8nWebhookUrl);
    } else {
      reset();
    }
  }, [config, setValue, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: IntegrationFormData) => 
      organizationsService.upsertIntegrationConfig(organizationId!, { n8nWebhookUrl: data.n8nWebhookUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-config', organizationId] });
      addToast('Webhook configurado com sucesso!', 'success');
      onClose();
      reset();
    },
    onError: () => {
      addToast('Erro ao configurar Webhook.', 'error');
    }
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
              <Webhook className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Configuração do n8n
            </h2>
            <p className="text-zinc-400 text-sm">
              Defina a URL do Webhook que receberá os dados de postagem de <strong className="text-white">{organizationName}</strong>.
            </p>
          </div>

          {isLoadingConfig ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin loader-gradient" />
            </div>
          ) : (
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  URL do Webhook (Fornecida pelo n8n)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Webhook className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    {...register('n8nWebhookUrl', { 
                      required: 'A URL do Webhook é obrigatória',
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'Insira uma URL válida começando com http ou https'
                      }
                    })}
                    placeholder="https://sua-url.n8n.com/webhook/..."
                    className={cn(
                      "w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium",
                      errors.n8nWebhookUrl && "border-red-500/50 focus:ring-red-500/50"
                    )}
                  />
                </div>
                {errors.n8nWebhookUrl && (
                  <p className="text-red-400 text-xs mt-1">{errors.n8nWebhookUrl.message}</p>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl font-bold text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 btn-primary py-3 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {mutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    'Salvar Configuração'
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
