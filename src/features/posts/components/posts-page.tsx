import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { GlassCard } from '@/shared/components/glass-card';
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Image as ImageIcon,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { campaignsService } from '@/features/campaigns/api/campaigns-service';
import { postsService } from '../api/posts-service';
import { CreatePostModal } from './create-post-modal';
import { EditPostModal } from './edit-post-modal';
import { DeletePostModal } from './delete-post-modal';
import { UploadVersionModal } from './upload-version-modal';
import { PostActionsMenu } from './post-actions-menu';
import { Upload } from 'lucide-react';

export default function PostsPage() {
  const { orgId, id: campaignId } = useParams<{ orgId: string, id: string }>();
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  
  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isDesigner = role === 'DESIGNER';
  const isClient = role === 'CLIENT';

  // Detalhes da Campanha
  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignsService.getAll().then(res => res.find(c => c.id === campaignId)),
    enabled: !!campaignId
  });

  // Lista de Posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', campaignId],
    queryFn: () => postsService.getByCampaign(campaignId!),
    enabled: !!campaignId
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Aprovado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 };
      case 'ALTERATION_REQUESTED':
        return { label: 'Alteração Solicitada', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertCircle };
      case 'CANCELLED':
        return { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle };
      default:
        return { label: 'Pendente', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link 
            to={`/organizations/${orgId}/campaigns`} 
            className="text-xs text-zinc-500 hover:text-primary flex items-center gap-1 mb-2 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar para Campanhas
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-glow flex items-center gap-3">
            {campaign?.title || 'Campanha'}
          </h1>
          <p className="text-zinc-500 text-sm">Cronograma de postagens e artes.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_oklch(var(--primary)/0.3)] w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Novo Post
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {posts.map((post, index) => {
          const status = getStatusConfig(post.status);
          const Icon = status.icon;

          // Buscar o asset mais recente do tipo FEED
          const feedAsset = post.assets?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(a => a.assetType === 'FEED');
          const previewUrl = post.currentVersion?.feedUrl || feedAsset?.cloudinaryUrl || null;

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Link 
                to={`/organizations/${orgId}/campaigns/${campaignId}/posts/${post.id}`}
                className="block h-full group"
              >
                <GlassCard className="hover:border-white/20 transition-all flex flex-col h-full active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                    <Icon className="w-3 h-3" />
                    {status.label}
                  </div>
                  <div 
                    onClick={(e) => e.preventDefault()} // Impede o link do card de disparar ao clicar no menu
                    className="relative z-20"
                  >
                    <PostActionsMenu 
                      postId={post.id}
                      isAdmin={isAdmin}
                      onEdit={(postId) => {
                        setSelectedPostId(postId);
                        setIsEditModalOpen(true);
                      }}
                      onDelete={(postId) => {
                        setSelectedPostId(postId);
                        setIsDeleteModalOpen(true);
                      }}
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {/* Container da Imagem: Altura adaptável com min-h para quem não tem imagem */}
                  <div className="relative w-full rounded-xl overflow-hidden bg-black/20 border border-white/5 mb-4 group-hover:border-primary/20 transition-all min-h-[120px] sm:min-h-[250px] flex flex-col items-center justify-center">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        className="w-full h-auto max-h-[200px] sm:max-h-[400px] object-contain transition-transform duration-500 group-hover:scale-105"
                        alt="Preview do Post"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                        <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-50 text-center px-2">Sem Arte</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none">
                          {new Date(post.scheduledFor).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-lg font-bold leading-none mt-0.5">
                          {new Date(post.scheduledFor).getDate()}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-zinc-500 hidden sm:inline">
                        Agendado
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {(isAdmin || isDesigner) && (!post.currentVersionId || post.status === 'ALTERATION_REQUESTED') && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedPostId(post.id);
                            setIsUploadModalOpen(true);
                          }}
                          className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 text-primary hover:text-white transition-all bg-primary/10 hover:bg-primary rounded-xl relative z-20"
                          title={post.currentVersionId ? 'Nova Versão' : 'Upload'}
                        >
                          <Upload className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                        </button>
                      )}
                      {(isAdmin || isDesigner || isClient) && post.currentVersionId && (
                        <div 
                          className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 text-emerald-400 hover:text-white transition-all bg-emerald-500/10 hover:bg-emerald-500 rounded-xl"
                          title="Abrir Preview"
                        >
                          <ImageIcon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
              </Link>
            </motion.div>
          );
        })}

        {posts.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-zinc-400 mb-2">Nenhum post agendado</h3>
            <p className="text-zinc-600 mb-8 max-w-xs mx-auto text-sm text-balance">
              {isAdmin 
                ? "Comece agendando o primeiro post para este cronograma mensal."
                : "Aguardando o administrador cadastrar o cronograma de posts."
              }
            </p>
            {isAdmin && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors font-bold"
              >
                <Plus className="w-4 h-4" />
                Agendar Primeiro Post
              </button>
            )}
          </div>
        )}
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        campaignId={campaignId!}
      />

      {selectedPostId && (
        <>
          <EditPostModal 
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPostId(null);
            }}
            postId={selectedPostId}
            campaignId={campaignId!}
          />

          <DeletePostModal 
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedPostId(null);
            }}
            postId={selectedPostId}
            campaignId={campaignId!}
            orgId={orgId}
          />

          <UploadVersionModal 
            isOpen={isUploadModalOpen}
            onClose={() => {
              setIsUploadModalOpen(false);
              setSelectedPostId(null);
            }}
            postId={selectedPostId}
            campaignId={campaignId!}
          />
        </>
      )}
    </div>
  );
}