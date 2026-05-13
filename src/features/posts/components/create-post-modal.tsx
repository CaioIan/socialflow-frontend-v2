import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { postsService } from '../api/posts-service';
import { Loader2, Calendar, FileText, Type, Image as ImageIcon, Upload, Check } from 'lucide-react';

const createPostSchema = z.object({
  scheduledFor: z.string().min(1, 'A data é obrigatória'),
  briefing: z.string().max(500, 'O briefing deve ter no máximo 500 caracteres').optional(),
  captionFixed: z.string().min(1, 'A legenda fixa é obrigatória').max(2000),
  referenceFile: z.any().optional(),
});

type CreatePostForm = z.infer<typeof createPostSchema>;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}

export function CreatePostModal({ isOpen, onClose, campaignId }: CreatePostModalProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
  });

  const selectedFile = watch('referenceFile');

  React.useEffect(() => {
    if (selectedFile && selectedFile[0]) {
      const url = URL.createObjectURL(selectedFile[0]);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const mutation = useMutation({
    mutationFn: async (data: CreatePostForm) => {
      // 1. Cria o Post (casca)
      const post = await postsService.create({
        campaignId,
        scheduledFor: new Date(data.scheduledFor).toISOString(),
        briefing: data.briefing,
        captionFixed: data.captionFixed
      });

      // 2. Se houver arquivo, faz o upload como Asset
      if (data.referenceFile && data.referenceFile[0]) {
        setIsUploading(true);
        try {
          await postsService.uploadAsset(data.referenceFile[0], post.id, 'FEED');
        } finally {
          setIsUploading(false);
        }
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPreviewUrl(null);
        reset();
        onClose();
      }, 1500);
    },
  });

  const onSubmit = (data: CreatePostForm) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Novo Post" className="max-w-4xl w-full">
      {isSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Post Criado!</h3>
          <p className="text-zinc-500 text-sm">O cronograma foi atualizado com sucesso.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="scheduledFor" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Publicação
                </label>
                <input
                  id="scheduledFor"
                  type="datetime-local"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium [color-scheme:dark]"
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
                  rows={2}
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
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
                  {...register('captionFixed')}
                />
                {errors.captionFixed && (
                  <p className="text-xs text-red-400 mt-1">{errors.captionFixed.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-2 h-full">
              <label htmlFor="referenceFile" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Referência Visual (Opcional)
              </label>
              <div className="relative group/file flex-1 flex flex-col min-h-[250px]">
                <input
                  id="referenceFile"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  {...register('referenceFile')}
                />
                {previewUrl ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-primary/30 flex-1">
                    <img src={previewUrl} className="w-full h-full object-cover absolute inset-0" alt="Preview" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full">Trocar Imagem</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex-1 bg-white/5 border-2 border-dashed border-white/10 group-hover/file:border-transparent group-hover/file:bg-brand-gradient rounded-xl flex flex-col items-center justify-center text-center transition-all px-4 py-8">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 text-zinc-600 group-hover/file:scale-110 group-hover/file:text-primary transition-all">
                      <Upload className="w-6 h-6 text-zinc-600" />
                    </div>
                    <span className="text-sm text-zinc-500 group-hover/file:text-primary transition-colors">
                      Arraste a imagem ou clique aqui
                    </span>
                    <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest font-bold">Resolução livre • JPG, PNG ou WEBP</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || isUploading}
              className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {mutation.isPending || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isUploading ? 'Subindo Imagem...' : 'Agendando...'}
                </>
              ) : (
                'Agendar Post'
              )}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-400 text-center mt-3">
              Erro ao agendar post. Tente novamente ou verifique a conexão.
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}