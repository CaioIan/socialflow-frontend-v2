import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrganizationAccess } from '@/shared/hooks/use-organization-access';
import { postsService, type PostStatus } from '../api/posts-service';
import { postCommentsService } from '../api/post-comments-service';
import { GlassCard } from '@/shared/components/glass-card';
import { ReplaceAssetModal } from './replace-asset-modal';
import { AdjustmentRequestModal } from './adjustment-request-modal';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Calendar,
  User,
  RotateCw,
  Pencil,
  ChevronRight,
  Download,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { useToastStore } from '@/stores/use-toast-store';

export default function PostDetailPage() {
  const { orgId, campId, postId } = useParams<{ orgId: string, campId: string, postId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasAccess } = useOrganizationAccess(orgId);
  const { addToast } = useToastStore();
  const [copied, setCopied] = useState(false);
  const [isReplaceAssetModalOpen, setIsReplaceAssetModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<'FEED' | 'STORIES'>('FEED');
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isDesigner = role === 'DESIGNER';
  const isClient = role === 'CLIENT';

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsService.getById(postId!),
    enabled: !!postId && hasAccess
  });

  const { data: comments } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => postCommentsService.getByPost(postId!),
    enabled: !!postId
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: PostStatus) => postsService.updateStatus(postId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', campId] });
      addToast("Status do post atualizado!", "success");
    },
    onError: () => {
      addToast("Erro ao atualizar status.", "error");
    }
  });

  const handleRequestAdjustment = async (comment: string, target: 'FEED' | 'STORIES' | 'GENERAL') => {
    if (!post?.currentVersionId) return;
    setIsSubmittingAdjustment(true);
    try {
      // Verificar se já existe um comentário deste usuário para esta versão
      const existingComment = comments?.find(
        c => c.postVersionId === post.currentVersionId && c.authorUserId === user?.id
      );

      if (existingComment) {
        // Atualizar comentário existente
        await postCommentsService.update(existingComment.id, {
          target,
          body: comment
        });
      } else {
        // Criar novo comentário
        await postCommentsService.create({
          postId: postId!,
          postVersionId: post.currentVersionId!,
          target,
          body: comment
        });
      }

      // 2. Atualizar o status
      await updateStatusMutation.mutateAsync('ALTERATION_REQUESTED');

      // 3. Sucesso: fechar modal e avisar
      setIsAdjustmentModalOpen(false);
      addToast("Solicitação de ajuste enviada com sucesso!", "success");

      // 4. Atualizar dados na tela
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    } catch (error) {
      console.error('Error requesting adjustment', error);
      addToast("Erro ao enviar solicitação de ajuste.", "error");
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleDownload = async (url: string | null, type: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `socialflow-${type}-${postId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const handleCopyCaption = () => {
    if (post?.captionFixed) {
      navigator.clipboard.writeText(post.captionFixed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Carregando preview...</p>
      </div>
    );
  }

  if (!post) return <div>Post não encontrado.</div>;

  // LÓGICA CORRIGIDA: Encontra o asset específico e mais recente pelo seu tipo.
  // Ordena por data de criação para garantir que o mais novo seja pego.
  const feedAsset = post.assets?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(a => a.assetType === 'FEED');
  const storiesAsset = post.assets?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(a => a.assetType === 'STORIES');

  // Usa a URL e o ID do asset encontrado.
  const feedUrl = feedAsset?.cloudinaryUrl || null;
  const storiesUrl = storiesAsset?.cloudinaryUrl || null;

  const feedAssetId = feedAsset?.id || null;
  const storiesAssetId = storiesAsset?.id || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          to={`/organizations/${orgId}/campaigns/${campId}/posts`}
          className="text-sm text-zinc-500 hover:text-primary flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar ao Cronograma</span>
          <span className="sm:hidden">Voltar</span>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-400`}>
            Status: {post.status}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <GlassCard className="p-8">
              <div className="flex flex-wrap gap-6 mb-8 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium text-white">
                    {new Date(post.scheduledFor).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às {new Date(post.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="w-4 h-4 text-primary" />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Briefing Operacional</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed bg-white/2 border border-white/5 rounded-2xl p-5 italic">
                    {post.briefing || 'Nenhum briefing fornecido.'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Legenda Fixa Oficial</h4>
                    <button
                      onClick={handleCopyCaption}
                      className="text-[10px] font-bold flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copiado!' : 'Copiar Legenda'}
                    </button>
                  </div>
                  <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-5 text-sm text-white leading-relaxed font-mono whitespace-pre-wrap shadow-inner">
                    {post.captionFixed}
                  </div>
                </div>
              </div>

              {/* Approval Panel - Only for CLIENT */}
              {isClient && (
                <div className="mt-10 pt-8 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {post.status !== 'APPROVED' && (
                      <button
                        onClick={() => updateStatusMutation.mutate('APPROVED')}
                        disabled={updateStatusMutation.isPending || !post.currentVersionId}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:grayscale"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Aprovar Post
                      </button>
                    )}
                    {post.status !== 'CANCELLED' && (
                      <button
                        onClick={() => setIsAdjustmentModalOpen(true)}
                        disabled={
                          updateStatusMutation.isPending ||
                          !post.currentVersionId ||
                          post.status === 'ALTERATION_REQUESTED' ||
                          post.status === 'APPROVED'
                        }
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:grayscale"
                      >
                        <AlertCircle className="w-5 h-5" />
                        {post.status === 'ALTERATION_REQUESTED' ? 'Ajuste já solicitado' : 'Solicitar Ajuste'}
                      </button>
                    )}
                  </div>
                  {!post.currentVersionId && (
                    <p className="text-[10px] text-zinc-500 text-center mt-4">
                      Aguardando a designer fazer o upload da primeira versão para habilitar aprovação.
                    </p>
                  )}
                  {post.status === 'APPROVED' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wider">Este post foi aprovado!</span>
                    </div>
                  )}
                  {post.status === 'APPROVED' && post.statusHistory && (
                    (() => {
                      const approval = post.statusHistory.find(h => h.toStatus === 'APPROVED');
                      return approval ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
                          <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Aprovado por</div>
                          <div className="text-sm font-medium text-emerald-300 mb-1">
                            {approval.changedByUser.name || approval.changedByUser.email}
                          </div>
                          <div className="text-xs text-zinc-600">
                            {new Date(approval.createdAt).toLocaleDateString('pt-BR')} às {new Date(approval.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>

          <GlassCard className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Comentários e Histórico</h3>
            </div>

            <div className="space-y-4">
              {comments && post.currentVersionId && comments.filter(c => c.postVersionId === post.currentVersionId).length > 0 ? (
                <>
                  <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Comentários da Versão Atual
                    </span>
                  </div>
                  {comments.filter(c => c.postVersionId === post.currentVersionId).map(comment => (
                    <div key={comment.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                        {comment.authorUser?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{comment.authorUser?.name || 'User'}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500">
                              {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {comment.authorUserId === user?.id && (
                              <button
                                onClick={() => setIsAdjustmentModalOpen(true)}
                                className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-white"
                                title="Editar comentário"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="inline-block px-2 py-0.5 rounded bg-black/30 border border-white/5 text-[10px] font-bold text-zinc-400 mb-2">
                          {comment.target === 'GENERAL' ? 'GERAL' : comment.target}
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-12 text-center text-zinc-600">
                  <p className="text-sm">Nenhum comentário por enquanto nesta versão.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Premium Instagram Preview (Desktop) / Raw Art (Mobile) */}
        <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {/* Desktop Preview: Raw Art View */}
            <div className="hidden lg:flex flex-col gap-10">
              {feedUrl && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Arte do Feed</h3>
                    <button
                      onClick={() => handleDownload(feedUrl, 'feed')}
                      className="flex items-center gap-2 text-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider group"
                    >
                      <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Baixar HD
                    </button>
                  </div>
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/20 group cursor-zoom-in">
                    <img
                      src={feedUrl}
                      className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                      alt="Arte Feed"
                    />
                  </div>
                </div>
              )}

              {storiesUrl && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Arte do Stories</h3>
                    <button
                      onClick={() => handleDownload(storiesUrl, 'stories')}
                      className="flex items-center gap-2 text-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider group"
                    >
                      <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Baixar HD
                    </button>
                  </div>
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/20 aspect-[9/16] group cursor-zoom-in">
                    <img
                      src={storiesUrl}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt="Arte Stories"
                    />
                  </div>
                </div>
              )}

              {!feedUrl && !storiesUrl && (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                  <p className="text-zinc-600 font-medium">Nenhuma arte disponível para esta versão.</p>
                </div>
              )}
            </div>

            {/* Mobile Carousel View */}
            <div className="lg:hidden">
              {/* Carousel View with Indicators */}
              <div className="relative group/carousel">
                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-4">
                  {feedUrl && (
                    <div className="min-w-full snap-center space-y-2 relative">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Arte do Feed</span>
                        <button
                          onClick={() => handleDownload(feedUrl, 'feed')}
                          className="flex items-center gap-1.5 text-primary hover:text-white transition-colors text-[10px] font-bold uppercase"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar HD
                        </button>
                      </div>
                      <div className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-black/20">
                        <img src={feedUrl} className="w-full h-auto" alt="Arte Feed" />
                      </div>
                    </div>
                  )}

                  {storiesUrl && (
                    <div className="min-w-full snap-center space-y-2 relative">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Arte do Stories</span>
                        <button
                          onClick={() => handleDownload(storiesUrl, 'stories')}
                          className="flex items-center gap-1.5 text-primary hover:text-white transition-colors text-[10px] font-bold uppercase"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar HD
                        </button>
                      </div>
                      <div className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-black/20 aspect-[9/16]">
                        <img src={storiesUrl} className="w-full h-full object-cover" alt="Arte Stories" />
                      </div>
                    </div>
                  )}

                  {!feedUrl && !storiesUrl && (
                    <div className="min-w-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                      <p className="text-zinc-600 text-sm">Nenhuma arte disponível para esta versão.</p>
                    </div>
                  )}
                </div>

                {/* Floating Arrow Indicator (Mobile Only) */}
                {(feedUrl && storiesUrl) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none animate-pulse">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-full text-white/70 shadow-2xl">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>

              {/* Carousel Indicators (Dots) */}
              {(feedUrl && storiesUrl) && (
                <div className="flex justify-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_oklch(var(--primary)/0.5)]"></div>
                  <div className="w-2 h-2 rounded-full bg-white/10"></div>
                </div>
              )}
            </div>

            {/* Replace Asset Buttons - Visible for ADMIN and DESIGNER */}
            {(isAdmin || isDesigner) && (post.currentVersion?.feedUrl || post.currentVersion?.storiesUrl) && (
              <div className="space-y-3 pt-4">
                {post.currentVersion?.feedUrl && (
                  <button
                    onClick={() => {
                      setSelectedAssetId(feedAssetId || 'feed-placeholder');
                      setSelectedAssetType('FEED');
                      setIsReplaceAssetModalOpen(true);
                    }}
                    className="w-full py-2 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 transition-all"
                  >
                    <RotateCw className="w-4 h-4" />
                    Reuplocar Feed
                  </button>
                )}

                {post.currentVersion?.storiesUrl && (
                  <button
                    onClick={() => {
                      setSelectedAssetId(storiesAssetId || 'stories-placeholder');
                      setSelectedAssetType('STORIES');
                      setIsReplaceAssetModalOpen(true);
                    }}
                    className="w-full py-2 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 transition-all"
                  >
                    <RotateCw className="w-4 h-4" />
                    Reuplocar Stories
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Replace Asset Modal */}
      {selectedAssetId && (
        <ReplaceAssetModal
          isOpen={isReplaceAssetModalOpen}
          onClose={() => {
            setIsReplaceAssetModalOpen(false);
            setSelectedAssetId(null);
          }}
          assetId={selectedAssetId !== 'feed-placeholder' && selectedAssetId !== 'stories-placeholder' ? selectedAssetId : undefined}
          currentAssetUrl={selectedAssetType === 'FEED' ? feedUrl || undefined : storiesUrl || undefined}
          assetType={selectedAssetType}
          postId={postId!}
          campaignId={campId!}
          currentImageUrl={selectedAssetType === 'FEED' ? feedUrl || undefined : storiesUrl || undefined}
        />
      )}

      {/* Adjustment Request Modal */}
      <AdjustmentRequestModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSubmit={handleRequestAdjustment}
        isLoading={isSubmittingAdjustment}
        initialComment={comments?.find(c => c.postVersionId === post.currentVersionId && c.authorUserId === user?.id)?.body}
        initialTarget={comments?.find(c => c.postVersionId === post.currentVersionId && c.authorUserId === user?.id)?.target}
      />
    </div>
  );
}
