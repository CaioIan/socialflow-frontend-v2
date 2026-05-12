import * as React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { organizationsService } from '../api/organizations-service';
import { Loader2, Webhook } from 'lucide-react';
import { useToastStore } from '@/stores/use-toast-store';

const webhookSchema = z.object({
  n8nWebhookUrl: z.string().url('URL inválida').or(z.literal('')),
});

type WebhookForm = z.infer<typeof webhookSchema>;

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: { id: string; name: string; n8nWebhookUrl?: string };
}

export function WebhookConfigModal({
  isOpen,
  onClose,
  organization,
}: WebhookConfigModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<WebhookForm>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      n8nWebhookUrl: organization?.n8nWebhookUrl || '',
    },
  });

  React.useEffect(() => {
    if (organization) {
      setValue('n8nWebhookUrl', organization.n8nWebhookUrl || '');
    }
  }, [organization, setValue]);

  const mutation = useMutation({
    mutationFn: (data: WebhookForm) =>
      organizationsService.update(organization.id, {
        name: organization.name,
        slug: '', // Service will handle it
        n8nWebhookUrl: data.n8nWebhookUrl || undefined,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      addToast('Configuração de webhook atualizada!', 'success');
      onClose();
    },
    onError: () => {
      addToast('Erro ao atualizar webhook.', 'error');
    },
  });

  const onSubmit: SubmitHandler<WebhookForm> = (data) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Integração Webhook - ${organization?.name}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-4 items-start mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Webhook className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Automação Externa</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Configure o endpoint do n8n para receber os payloads de postagens aprovadas desta organização.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="n8nWebhookUrl" className="text-sm font-medium text-zinc-400">
            Webhook URL (n8n)
          </label>

          <input
            id="n8nWebhookUrl"
            placeholder="https://sua-instancia.n8n.cloud/webhook/..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            {...register('n8nWebhookUrl')}
          />

          {errors.n8nWebhookUrl && (
            <p className="text-xs text-red-400 mt-1">
              {errors.n8nWebhookUrl.message}
            </p>
          )}
          <p className="text-[10px] text-zinc-500">
            Este URL será chamado via POST toda vez que um post desta organização for aprovado.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-3 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Webhook'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
