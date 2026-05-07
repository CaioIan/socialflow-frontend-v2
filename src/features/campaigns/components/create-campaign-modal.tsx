import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { campaignsService } from '../api/campaigns-service';
import { Loader2 } from 'lucide-react';

const createCampaignSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres').max(255),
  referenceYear: z.string().transform(v => v ? parseInt(v) : undefined).optional(),
  referenceMonth: z.string().transform(v => v ? parseInt(v) : undefined).optional(),
});

type CreateCampaignForm = z.infer<typeof createCampaignSchema>;

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  initialData?: {
    id: string;
    title: string;
    referenceYear: number | null;
    referenceMonth: number | null;
  };
}

export function CreateCampaignModal({ isOpen, onClose, organizationId, initialData }: CreateCampaignModalProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema) as any,
    defaultValues: {
      title: initialData?.title || '',
      referenceYear: (initialData?.referenceYear || currentYear).toString() as any,
      referenceMonth: (initialData?.referenceMonth || '').toString() as any,
    }
  });

  // Sincroniza o form se o initialData mudar
  React.useEffect(() => {
    if (initialData) {
      setValue('title', initialData.title);
      setValue('referenceYear', (initialData.referenceYear || currentYear).toString() as any);
      setValue('referenceMonth', (initialData.referenceMonth || '').toString() as any);
    } else {
      reset({
        title: '',
        referenceYear: currentYear.toString() as any,
        referenceMonth: '' as any,
      });
    }
  }, [initialData, setValue, reset, currentYear]);

  const mutation = useMutation({
    mutationFn: (data: CreateCampaignForm) => 
      isEditing 
        ? campaignsService.update(initialData!.id, data as any)
        : campaignsService.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', organizationId] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: CreateCampaignForm) => {
    mutation.mutate(data as any);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Campanha' : 'Nova Campanha'}>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-zinc-400">
            Título da Campanha
          </label>
          <input
            id="title"
            placeholder="Ex: Artes de Maio 2026"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            {...register('title')}
          />
          {errors.title && (
            <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="referenceMonth" className="text-sm font-medium text-zinc-400">
              Mês de Referência
            </label>
            <select
              id="referenceMonth"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer font-medium"
              {...register('referenceMonth')}
            >
              <option value="" className="bg-zinc-900">Selecione...</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1} className="bg-zinc-900">
                  {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2024, i))}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="referenceYear" className="text-sm font-medium text-zinc-400">
              Ano
            </label>
            <select
              id="referenceYear"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer font-medium"
              {...register('referenceYear')}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <option key={year} value={year} className="bg-zinc-900">
                  {year}
                </option>
              ))}
            </select>
          </div>
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
                {isEditing ? 'Salvando...' : 'Criando...'}
              </>
            ) : (
              isEditing ? 'Salvar Alterações' : 'Criar Campanha'
            )}
          </button>
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400 text-center">
            Erro ao criar campanha. Verifique se você selecionou uma organização.
          </p>
        )}
      </form>
    </Modal>
  );
}
