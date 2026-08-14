import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Inbox, ImageOff } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import dashboardService, { type PostStatus } from '../api/dashboard-service';
import type { DesignerPostCategory } from '../api/dashboard-service';
import { useAuthStore } from '@/stores/use-auth-store';

interface PostDrilldownModalProps {
  status: PostStatus | null;
  organizationId?: string;
  /** Recorta os PENDING entre os que já têm arte e os que ainda esperam. */
  comArte?: boolean;
  designerCategory?: DesignerPostCategory | null;
  onClose: () => void;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  PENDING: 'Posts Pendentes',
  ALTERATION_REQUESTED: 'Posts com Solicitação de Ajuste',
  APPROVED: 'Posts Aprovados',
  PUBLISHED: 'Posts Publicados',
  FAILED: 'Posts com Falha ao Publicar',
};

const DESIGNER_CATEGORY_LABEL: Record<DesignerPostCategory, string> = {
  PENDING_WITHOUT_ART: 'Pendentes sem arte',
  PENDING_WITH_ART: 'Pendentes com Arte',
  ALTERATION_REQUESTED: 'Pedidos de Ajuste',
  APPROVED: 'Artes aprovadas',
};

export function PostDrilldownModal({
  status,
  organizationId,
  comArte,
  designerCategory,
  onClose,
}: PostDrilldownModalProps) {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const aberto = Boolean(status || designerCategory);

  const { data, isLoading } = useQuery({
    // `comArte` entra na chave: sem isso as duas filas de PENDING dividiriam o
    // mesmo cache e a segunda mostraria o resultado da primeira.
    queryKey: designerCategory
      ? ['designer-dashboard', userId, 'posts', designerCategory, organizationId]
      : ['dashboard-posts', status, organizationId, comArte],
    queryFn: () =>
      designerCategory
        ? dashboardService.getDesignerPosts(designerCategory, organizationId, 0, 20)
        : dashboardService.getPostsByStatus(status!, organizationId, 0, 20, comArte),
    enabled: aberto,
  });

  return (
    <Modal
      isOpen={aberto}
      onClose={onClose}
      title={
        designerCategory
          ? DESIGNER_CATEGORY_LABEL[designerCategory]
          : status === 'PENDING' && comArte === true
          ? 'Pendentes com Arte'
          : status === 'PENDING' && comArte === false
            ? 'Pendentes sem Arte'
            : status
              ? STATUS_LABEL[status]
              : ''
      }
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
              {/* Miniatura antes do texto: numa fila de posts parecidos, a arte
                  identifica mais rápido do que a legenda. Quem ainda não tem
                  arte mostra a moldura vazia, que também é informação. */}
              <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                {post.previewUrl ? (
                  <img
                    src={post.previewUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageOff className="w-5 h-5 text-zinc-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 truncate flex items-center gap-1.5">
                  {post.organizationLogoUrl ? (
                    <img
                      src={post.organizationLogoUrl}
                      alt=""
                      loading="lazy"
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-white/10 shrink-0" />
                  )}
                  <span className="truncate">{post.organizationName} · {post.campaignTitle}</span>
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
