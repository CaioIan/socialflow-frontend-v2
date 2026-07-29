import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Inbox } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import dashboardService, { type PostStatus } from '../api/dashboard-service';

interface PostDrilldownModalProps {
  status: PostStatus | null;
  organizationId?: string;
  onClose: () => void;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  PENDING: 'Posts Pendentes',
  ALTERATION_REQUESTED: 'Posts com Solicitação de Ajuste',
  APPROVED: 'Posts Aprovados',
  CANCELLED: 'Posts Cancelados',
};

export function PostDrilldownModal({ status, organizationId, onClose }: PostDrilldownModalProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-posts', status, organizationId],
    queryFn: () => dashboardService.getPostsByStatus(status!, organizationId),
    enabled: !!status,
  });

  return (
    <Modal
      isOpen={!!status}
      onClose={onClose}
      title={status ? STATUS_LABEL[status] : ''}
      className="max-w-2xl"
    >
      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Carregando posts...</span>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-600">
          <Inbox className="w-10 h-10" />
          <span className="text-sm">Nenhum post nesse status.</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto -mx-2 px-2">
          {data.items.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 bg-white/5 border border-white/5 rounded-2xl p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 truncate">
                  {post.organizationName} · {post.campaignTitle}
                </p>
                <p className="text-sm text-zinc-200 truncate mt-1">{post.captionFixed}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(post.scheduledFor).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/organizations/${post.organizationId}/campaigns/${post.campaignId}/posts/${post.id}`);
                }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-gradient hover:opacity-90 text-white text-xs font-bold transition-all"
              >
                Ver post
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {data.total > data.items.length && (
            <p className="text-center text-xs text-zinc-600 pt-2">
              Mostrando {data.items.length} de {data.total} posts.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
