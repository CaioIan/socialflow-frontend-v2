import * as React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { organizationsService } from '../api/organizations-service';
import { Loader2 } from 'lucide-react';

// 🔥 Schema agora só valida o que vem do form (sem slug e sem webhook)
const createOrgSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').max(255),
});

type CreateOrgForm = z.infer<typeof createOrgSchema>;

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: { id: string; name: string };
}

// 🔥 Função de slug (centralizada no front)
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateOrganizationModal({
  isOpen,
  onClose,
  initialData,
}: CreateOrganizationModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: initialData?.name || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
    } else {
      reset({ name: '' });
    }
  }, [initialData, setValue, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEditing
        ? organizationsService.update(initialData!.id, data)
        : organizationsService.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      reset({ name: '' });
      onClose();
    },
  });

  const onSubmit: SubmitHandler<CreateOrgForm> = (data) => {
    const payload = {
      name: data.name,
      slug: slugify(data.name),
      isActive: true,
    };

    mutation.mutate(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Organização' : 'Nova Organização'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-zinc-400">
            Nome da Empresa
          </label>

          <input
            id="name"
            placeholder="Ex: Radiogenesis"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
            {...register('name')}
          />

          {errors.name && (
            <p className="text-xs text-red-400 mt-1">
              {errors.name.message}
            </p>
          )}
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
            ) : isEditing ? (
              'Salvar Alterações'
            ) : (
              'Criar Organização'
            )}
          </button>
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400 text-center">
            Erro ao processar organização. Tente novamente.
          </p>
        )}
      </form>
    </Modal>
  );
}