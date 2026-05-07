import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/components/modal';
import { postsService } from '../api/posts-service';
import { Loader2, AlertTriangle, Check } from 'lucide-react';

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postBriefing?: string;
  campaignId: string;
  orgId?: string;
}

export function DeletePostModal({ 
  isOpen, 
  onClose, 
  postId, 
  postBriefing,
  campaignId,
  orgId
}: DeletePostModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      return await postsService.delete(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        // Redireciona para a página de posts
        if (orgId) {
          navigate(`/organizations/${orgId}/campaigns/${campaignId}/posts`);
        }
      }, 1500);
    },
  });

  const handleDelete = () => {
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Exclusão" className="max-w-md">
      {isSuccess ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Post Deletado!</h3>
          <p className="text-zinc-500 text-sm">O post foi removido com sucesso.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white">Deletar este post?</h3>
              <p className="text-sm text-zinc-400">
                Esta ação não pode ser desfeita. O post será permanentemente removido do cronograma.
              </p>
              {postBriefing && (
                <p className="text-xs text-zinc-600 italic mt-3">
                  Post: "{postBriefing || 'Sem título'}"
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={mutation.isPending}
              className="flex-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white py-3 rounded-xl font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar Permanentemente'
              )}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-400 text-center">
              Erro ao deletar post. Tente novamente.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
