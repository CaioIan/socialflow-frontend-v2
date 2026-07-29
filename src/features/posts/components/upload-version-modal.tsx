import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { postsService } from '../api/posts-service';
import { Loader2, ImageIcon, Layers, Upload, CheckCircle, Plus, X } from 'lucide-react';
import { getApiErrorMessage } from '@/api/api-error';

interface UploadVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  campaignId: string;
}

export function UploadVersionModal({ isOpen, onClose, postId, campaignId }: UploadVersionModalProps) {
  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState<'idle' | string>('idle');
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedFiles, setFeedFiles] = useState<File[]>([]);
  const [feedPreviews, setFeedPreviews] = useState<string[]>([]);
  const [storiesFile, setStoriesFile] = useState<File | null>(null);
  const [storiesPreview, setStoriesPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFeedFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10 - feedFiles.length);
    setFeedFiles(prev => [...prev, ...newFiles]);
    setFeedPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
  };

  const removeFeedFile = (index: number) => {
    URL.revokeObjectURL(feedPreviews[index]);
    setFeedFiles(prev => prev.filter((_, i) => i !== index));
    setFeedPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleStoriesChange = (files: FileList | null) => {
    if (storiesPreview) URL.revokeObjectURL(storiesPreview);
    if (!files || !files[0]) { setStoriesFile(null); setStoriesPreview(null); return; }
    setStoriesFile(files[0]);
    setStoriesPreview(URL.createObjectURL(files[0]));
  };

  const resetAll = () => {
    feedPreviews.forEach(url => URL.revokeObjectURL(url));
    if (storiesPreview) URL.revokeObjectURL(storiesPreview);
    setFeedFiles([]);
    setFeedPreviews([]);
    setStoriesFile(null);
    setStoriesPreview(null);
    setError(null);
    setUploadStatus('idle');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (feedFiles.length === 0 && !storiesFile) {
        throw new Error('Pelo menos uma arte deve ser enviada');
      }

      const feedUrls: string[] = [];

      for (let i = 0; i < feedFiles.length; i++) {
        setUploadStatus(`Subindo Feed ${i + 1}/${feedFiles.length}...`);
        const asset = await postsService.uploadAsset(feedFiles[i], postId, 'FEED');
        feedUrls.push(asset.cloudinaryUrl);
      }

      let storiesUrl: string | undefined;
      if (storiesFile) {
        setUploadStatus('Subindo Stories...');
        const asset = await postsService.uploadAsset(storiesFile, postId, 'STORIES');
        storiesUrl = asset.cloudinaryUrl;
      }

      setUploadStatus('Processando...');
      return postsService.uploadVersion({ postId, feedUrls, storiesUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        resetAll();
        onClose();
      }, 1500);
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, err instanceof Error ? err.message : 'Erro ao enviar artes.'));
      setUploadStatus('idle');
    },
  });

  const handleClose = () => {
    resetAll();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Enviar Artes Finalizadas" className="max-w-4xl w-full">
      {isSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Artes Enviadas!</h3>
          <p className="text-zinc-500 text-sm">O cliente já pode visualizar as novas versões.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center text-xs text-primary font-medium italic">
            Selecione até 10 imagens para Feed (carrossel) e 1 para Stories.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feed images */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Feed ({feedFiles.length}/10)
              </label>

              {/* Existing feed image thumbnails */}
              {feedPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {feedPreviews.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                      <img src={url} className="w-full h-full object-cover" alt={`Feed ${i + 1}`} />
                      <button
                        onClick={() => removeFeedFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-bold">{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add more feed images */}
              {feedFiles.length < 10 && (
                <label className="relative group/file flex items-center justify-center h-24 bg-white/5 border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-brand-gradient rounded-xl cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => addFeedFiles(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Plus className="w-5 h-5 text-zinc-600 group-hover/file:text-primary transition-colors" />
                    <span className="text-xs text-zinc-500 group-hover/file:text-primary transition-colors">
                      {feedFiles.length === 0 ? 'Selecionar Feed' : 'Adicionar mais'}
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* Stories image */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Stories (9:16)
              </label>
              <div className="relative group/file flex flex-col min-h-[200px]">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => handleStoriesChange(e.target.files)}
                />
                {storiesPreview ? (
                  <div className="relative w-full flex-1 rounded-xl overflow-hidden border-2 border-primary/30 min-h-[200px]">
                    <img src={storiesPreview} className="w-full h-full object-cover absolute inset-0" alt="Stories" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold bg-black/60 px-3 py-1 rounded-full uppercase">Trocar Arte</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex-1 bg-white/5 border-2 border-dashed border-white/10 group-hover/file:border-transparent group-hover/file:bg-brand-gradient rounded-xl flex flex-col items-center justify-center text-center transition-all px-4 py-8 min-h-[200px]">
                    <Layers className="w-6 h-6 text-zinc-600 mx-auto mb-2 group-hover/file:scale-110 group-hover/file:text-primary transition-all" />
                    <span className="text-xs text-zinc-500 group-hover/file:text-primary transition-colors">
                      Selecionar Stories
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (feedFiles.length === 0 && !storiesFile)}
              className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadStatus !== 'idle' ? uploadStatus : 'Enviando...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Enviar para Aprovação
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
