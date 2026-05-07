import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { postsService } from '../api/posts-service';
import { Loader2, ImageIcon, Layers, Upload, CheckCircle } from 'lucide-react';

const uploadVersionSchema = z.object({
  feedFile: z.any().optional(),
  storiesFile: z.any().optional(),
}).refine(data => (data.feedFile && data.feedFile[0]) || (data.storiesFile && data.storiesFile[0]), {
  message: 'Pelo menos uma arte (Feed ou Stories) deve ser enviada',
  path: ['feedFile']
});

type UploadVersionForm = z.infer<typeof uploadVersionSchema>;

interface UploadVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  campaignId: string;
}

export function UploadVersionModal({ isOpen, onClose, postId, campaignId }: UploadVersionModalProps) {
  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading_feed' | 'uploading_stories' | 'saving'>('idle');
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedPreview, setFeedPreview] = useState<string | null>(null);
  const [storiesPreview, setStoriesPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UploadVersionForm>({
    resolver: zodResolver(uploadVersionSchema),
  });

  const selectedFeed = watch('feedFile');
  const selectedStories = watch('storiesFile');

  // Preview do Feed
  React.useEffect(() => {
    if (selectedFeed && selectedFeed[0]) {
      const url = URL.createObjectURL(selectedFeed[0]);
      setFeedPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFeedPreview(null);
    }
  }, [selectedFeed]);

  // Preview do Stories
  React.useEffect(() => {
    if (selectedStories && selectedStories[0]) {
      const url = URL.createObjectURL(selectedStories[0]);
      setStoriesPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setStoriesPreview(null);
    }
  }, [selectedStories]);

  const mutation = useMutation({
    mutationFn: async (data: UploadVersionForm) => {
      let feedUrl = '';
      let storiesUrl = '';

      // 1. Upload Feed se existir
      if (data.feedFile && data.feedFile[0]) {
        setUploadStatus('uploading_feed');
        const asset = await postsService.uploadAsset(data.feedFile[0], postId, 'FEED');
        feedUrl = asset.cloudinaryUrl;
      }

      // 2. Upload Stories se existir
      if (data.storiesFile && data.storiesFile[0]) {
        setUploadStatus('uploading_stories');
        const asset = await postsService.uploadAsset(data.storiesFile[0], postId, 'STORIES');
        storiesUrl = asset.cloudinaryUrl;
      }

      // 3. Registra a versão
      setUploadStatus('saving');
      return postsService.uploadVersion({
        postId,
        feedUrl: feedUrl || undefined,
        storiesUrl: storiesUrl || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFeedPreview(null);
        setStoriesPreview(null);
        reset();
        onClose();
        setUploadStatus('idle');
      }, 1500);
    },
    onError: () => {
      setUploadStatus('idle');
    }
  });

  const onSubmit = (data: UploadVersionForm) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar Artes Finalizadas" className="max-w-4xl w-full">
      {isSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Artes Enviadas!</h3>
          <p className="text-zinc-500 text-sm">O cliente já pode visualizar as novas versões.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-center text-xs text-primary font-medium italic">
            "Designer: Selecione os arquivos finais para Feed e Stories."
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col space-y-2 h-full">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Arte do Feed (1:1 / 4:5)
              </label>
              <div className="relative group/file flex-1 flex flex-col min-h-[300px]">
                <input
                  id="feedFile"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  {...register('feedFile')}
                />
                {feedPreview ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-primary/30 flex-1">
                    <img src={feedPreview} className="w-full h-full object-cover absolute inset-0" alt="Feed" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold bg-black/60 px-3 py-1 rounded-full uppercase">Trocar Arte</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex-1 bg-white/5 border-2 border-dashed border-white/10 group-hover/file:border-primary/50 group-hover/file:bg-primary/5 rounded-xl flex flex-col items-center justify-center text-center transition-all px-4 py-8">
                    <ImageIcon className="w-6 h-6 text-zinc-600 mx-auto mb-2 group-hover/file:scale-110 group-hover/file:text-primary transition-all" />
                    <span className="text-xs text-zinc-500 group-hover/file:text-primary transition-colors">
                      Selecionar imagem do Feed
                    </span>
                  </div>
                )}
              </div>
              {errors.feedFile && (
                <p className="text-xs text-red-400 mt-1">{errors.feedFile.message as string}</p>
              )}
            </div>

            <div className="flex flex-col space-y-2 h-full">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Arte do Stories (9:16)
              </label>
              <div className="relative group/file flex-1 flex flex-col min-h-[300px]">
                <input
                  id="storiesFile"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  {...register('storiesFile')}
                />
                {storiesPreview ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-primary/30 flex-1">
                    <img src={storiesPreview} className="w-full h-full object-cover absolute inset-0" alt="Stories" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold bg-black/60 px-3 py-1 rounded-full uppercase">Trocar Arte</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex-1 bg-white/5 border-2 border-dashed border-white/10 group-hover/file:border-primary/50 group-hover/file:bg-primary/5 rounded-xl flex flex-col items-center justify-center text-center transition-all px-4 py-8">
                    <Layers className="w-6 h-6 text-zinc-600 mx-auto mb-2 group-hover/file:scale-110 group-hover/file:text-primary transition-all" />
                    <span className="text-xs text-zinc-500 group-hover/file:text-primary transition-colors">
                      Selecionar imagem do Stories
                    </span>
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
              disabled={mutation.isPending || uploadStatus !== 'idle'}
              className="flex-[2] bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {uploadStatus !== 'idle' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadStatus === 'uploading_feed' && 'Subindo Feed...'}
                  {uploadStatus === 'uploading_stories' && 'Subindo Stories...'}
                  {uploadStatus === 'saving' && 'Processando...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Enviar para Aprovação
                </>
              )}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-400 text-center mt-3">
              Erro ao enviar artes. Verifique os arquivos e tente novamente.
            </p>
          )}
        </form>
      )}
        </Modal>
  )
};