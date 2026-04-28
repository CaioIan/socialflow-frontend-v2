import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { postsService } from '../api/posts-service';
import { Loader2, Calendar, FileText, Type, Check } from 'lucide-react';

const editPostSchema = z.object({
  scheduledFor: z.string().min(1, 'A data é obrigatória'),
  briefing: z.string().max(500, 'O briefing deve ter no máximo 500 caracteres').optional(),
  captionFixed: z.string().min(1, 'A legenda fixa é obrigatória').max(2000),
});

type EditPostForm = z.infer<typeof editPostSchema>;

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  campaignId: string;
}

export function EditPostModal({ isOpen, onClose, postId, campaignId }: EditPostModalProps) {
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);

  // Carregar dados do post
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsService.getById(postId),
    enabled: isOpen && !!postId,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<EditPostForm>({
    resolver: zodResolver(editPostSchema),
    values: post ? {
      scheduledFor: new Date(post.scheduledFor).toISOString().slice(0, 16),
      briefing: post.briefing || '',
      captionFixed: post.captionFixed,
    } : {
      scheduledFor: '',
      briefing: '',
      captionFixed: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditPostForm) => {
      return await postsService.update(postId, {
        scheduledFor: data.scheduledFor,
        briefing: data.briefing,
        captionFixed: data.captionFixed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    },
  });

  const onSubmit = (data: EditPostForm) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Post" className="max-w-xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : isSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Post Atualizado!</h3>
          <p className="text-zinc-500 text-sm">As alterações foram salvas com sucesso.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="scheduledFor" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Publicação
            </label>
            <input
              id="scheduledFor"
              type="datetime-local"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium scheme-dark"
              {...register('scheduledFor')}
            />
            {errors.scheduledFor && (
              <p className="text-xs text-red-400 mt-1">{errors.scheduledFor.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="briefing" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Briefing / Tema da Arte (Opcional)
            </label>
            <textarea
              id="briefing"
              placeholder="Ex: Arte focada em promoção de clareamento dental. Cores azul e branco."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
              {...register('briefing')}
            />
            {errors.briefing && (
              <p className="text-xs text-red-400 mt-1">{errors.briefing.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="captionFixed" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Legenda Fixa Oficial
            </label>
            <textarea
              id="captionFixed"
              placeholder="Escreva a legenda que será copiada pelo cliente..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
              {...register('captionFixed')}
            />
            {errors.captionFixed && (
              <p className="text-xs text-red-400 mt-1">{errors.captionFixed.message}</p>
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
              className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-400 text-center">
              Erro ao atualizar post. Tente novamente ou verifique a conexão.
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}
