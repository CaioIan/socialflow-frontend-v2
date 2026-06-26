import * as React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { aiConfigService } from '../api/ai-config-service';
import { Loader2, Sparkles } from 'lucide-react';
import { useToastStore } from '@/stores/use-toast-store';

interface AiConfigForm {
  roteiroPrompt: string;
  designPrompt: string;
}

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

export function AiConfigModal({ isOpen, onClose, organizationId, organizationName }: AiConfigModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const { data: config, isLoading } = useQuery({
    queryKey: ['ai-config', organizationId],
    queryFn: () => aiConfigService.get(organizationId),
    enabled: isOpen && !!organizationId,
    staleTime: 0,
  });

  const { register, handleSubmit, reset } = useForm<AiConfigForm>({
    defaultValues: { roteiroPrompt: '', designPrompt: '' },
  });

  React.useEffect(() => {
    if (isOpen && config !== undefined) {
      reset({
        roteiroPrompt: config?.roteiroPrompt ?? '',
        designPrompt: config?.designPrompt ?? '',
      });
    }
  }, [isOpen, config, reset]);

  const mutation = useMutation({
    mutationFn: (data: AiConfigForm) =>
      aiConfigService.upsert(organizationId, {
        roteiroPrompt: data.roteiroPrompt || undefined,
        designPrompt: data.designPrompt || undefined,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['ai-config', organizationId], saved);
      addToast('Configuração de IA salva!', 'success');
      onClose();
    },
    onError: () => {
      addToast('Erro ao salvar configuração de IA.', 'error');
    },
  });

  const onSubmit: SubmitHandler<AiConfigForm> = (data) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configuração de IA — ${organizationName}`} className="max-w-2xl">
      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Carregando configurações...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-4 items-start mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Prompts de IA por Cliente</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Configure os prompts de IA específicos para esta organização.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Prompt de Roteiro <span className="text-red-400">*</span>
              </label>
              <p className="text-[11px] text-zinc-500">
                Enviado ao n8n junto com o planejamento aprovado para gerar o roteiro JSON dos posts.
                <strong className="text-zinc-400"> Obrigatório</strong> para aprovar planejamentos.
              </p>
              <textarea
                rows={6}
                placeholder="Ex: Você é um especialista em conteúdo para redes sociais. Com base no planejamento abaixo, gere um roteiro em JSON com os campos: scheduledFor, briefing, captionFixed, stories..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y font-mono leading-relaxed"
                {...register('roteiroPrompt')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Prompt de Design
              </label>
              <p className="text-[11px] text-zinc-500">
                Usado pelo botão "GERAR COM CLAUDE" para gerar artes visuais para os posts desta empresa.
              </p>
              <textarea
                rows={5}
                placeholder="Ex: Crie artes no estilo da marca: cores [cores], tipografia [fonte], tom [formal/descontraído]..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y font-mono leading-relaxed"
                {...register('designPrompt')}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5">
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
              className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
