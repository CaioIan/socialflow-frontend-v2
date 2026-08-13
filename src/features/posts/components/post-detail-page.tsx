import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrganizationAccess } from '@/shared/hooks/use-organization-access';
import { postsService, type PostStatus } from '../api/posts-service';
import { rotuloDoStatus } from '../lib/post-status';
import { postCommentsService } from '../api/post-comments-service';
import { GlassCard } from '@/shared/components/glass-card';
import { ReplaceAssetModal } from './replace-asset-modal';
import { AdjustmentRequestModal } from './adjustment-request-modal';
import { UploadVersionModal } from './upload-version-modal';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
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
  ChevronRight,
  Download,
  Loader2,
  Layers,
  FileText,
  ChevronDown,
  Upload,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useToastStore } from '@/stores/use-toast-store';
import { getApiErrorMessage } from '@/api/api-error';

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
  const [isNovaVersaoModalOpen, setIsNovaVersaoModalOpen] = useState(false);
  const [pecaParaExcluir, setPecaParaExcluir] = useState<'FEED' | 'STORIES' | null>(null);
  const [confirmandoConclusao, setConfirmandoConclusao] = useState(false);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [briefingAberto, setBriefingAberto] = useState(false);

  // Carrossel do mobile: a bolinha acesa era sempre a primeira, então depois de
  // arrastar ela indicava a imagem errada.
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [slideAtual, setSlideAtual] = useState(0);

  /**
   * Descobre o slide visível pelo que está mais perto do centro da janela.
   *
   * Dividir `scrollLeft` pela largura de um slide seria mais curto, mas quebra
   * assim que os slides deixam de ter a mesma largura — é o caso aqui, onde a
   * arte de Stories é mais alta que a de Feed.
   */
  const aoRolarCarrossel = () => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    const centro = trilho.scrollLeft + trilho.clientWidth / 2;
    let maisProximo = 0;
    let menorDistancia = Infinity;

    Array.from(trilho.children).forEach((filho, i) => {
      const slide = filho as HTMLElement;
      const distancia = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centro);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisProximo = i;
      }
    });

    setSlideAtual(maisProximo);
  };

  const irParaSlide = (indice: number) => {
    const slide = trilhoRef.current?.children[indice] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isDesigner = role === 'DESIGNER';
  const isClient = role === 'CLIENT';

  const { data: post, isLoading, isFetching: recarregandoPost } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsService.getById(postId!),
    enabled: !!postId && hasAccess,
  });

  const { data: comments } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => postCommentsService.getByPost(postId!),
    enabled: !!postId
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, versionId, comment }: { status: PostStatus, versionId?: string, comment?: string }) => 
      postsService.updateStatus(postId!, status, versionId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] }); // Invalida todas as listas de posts
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['designer-dashboard'] });
      addToast("Status do post atualizado!", "success");
    },
    onError: (error: unknown) => {
      addToast(getApiErrorMessage(error, 'Erro ao atualizar status.'), 'error');
    }
  });

  const concluirAjusteMutation = useMutation({
    mutationFn: () => postsService.concluirAjuste(postId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['designer-dashboard'] });
      setConfirmandoConclusao(false);
      addToast('Ajuste concluído. O cliente foi avisado.', 'success');
    },
    onError: (error: unknown) => {
      addToast(getApiErrorMessage(error, 'Erro ao concluir o ajuste.'), 'error');
    },
  });

  const removerPecaMutation = useMutation({
    mutationFn: (piece: 'FEED' | 'STORIES') =>
      postsService.removerPecaDaArte({ postId: postId!, piece }),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['designer-dashboard'] });
      setPecaParaExcluir(null);
      addToast(
        resultado.ficouSemArte
          ? 'Arte excluída. O post voltou a aguardar arte.'
          : 'Arte excluída.',
        'success',
      );
    },
    onError: (error: unknown) => {
      addToast(getApiErrorMessage(error, 'Erro ao excluir a arte.'), 'error');
    },
  });

  /**
   * Trava os botões de decisão do cliente.
   *
   * Só `isPending` não basta: quando a mutation termina, o `post` em mãos ainda
   * é o antigo até a invalidação recarregar. Nessa fresta os botões voltavam a
   * ficar clicáveis, e dava para aprovar duas vezes.
   */
  const decisaoEmAndamento = updateStatusMutation.isPending || recarregandoPost;

  const handleRequestAdjustment = async (comment: string) => {
    if (!post?.currentVersionId) return;
    setIsSubmittingAdjustment(true);
    try {
      // O backend agora cria o comentário e o vínculo com o histórico automaticamente
      // em uma única transação quando enviamos o status 'ALTERATION_REQUESTED' com o campo 'comment'.
      await updateStatusMutation.mutateAsync({ 
        status: 'ALTERATION_REQUESTED', 
        versionId: post.currentVersionId,
        comment
      });

      setIsAdjustmentModalOpen(false);
      addToast("Solicitação de ajuste enviada com sucesso!", "success");
    } catch (error) {
      console.error('Error requesting adjustment', error);
      // O erro já é tratado no onError do mutation
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
    } catch {
      // Falha no download via blob (CORS, rede): abre em nova aba como fallback.
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

  /*
    A versão atual é a única fonte da arte exibida.

    Antes havia um segundo caminho: não achando a peça na versão, a tela
    procurava o asset mais recente entre TODOS os do post, de qualquer versão.
    Isso ressuscitava arte excluída — some o stories da versão, e a tela o
    trazia de volta a partir do asset de uma versão anterior, fazendo a exclusão
    parecer que não funcionou.

    Os assets da própria versão continuam servindo de reserva, porque posts
    antigos existem com `feedUrls` vazio e as artes só nos assets. O que saiu
    foi a busca que atravessava versões.
  */
  const currentVersionAssets = post.currentVersion?.assets || [];
  const feedUrls: string[] = post.currentVersion?.feedUrls?.length
    ? post.currentVersion.feedUrls
    : currentVersionAssets.filter(a => a.assetType === 'FEED').map(a => a.cloudinaryUrl);

  const feedAsset = currentVersionAssets.find(a => a.assetType === 'FEED');
  const storiesAsset = currentVersionAssets.find(a => a.assetType === 'STORIES');

  const feedUrl = feedUrls[0] || null;
  const storiesUrl = post.currentVersion?.storiesUrl || storiesAsset?.cloudinaryUrl || null;
  const isCarousel = feedUrls.length > 1;

  // No mobile a arte de Stories divide o mesmo trilho das artes de Feed, então
  // ela conta como slide para as bolinhas e para a sobra lateral.
  const totalSlides = feedUrls.length + (storiesUrl ? 1 : 0);
  const temMaisDeUmSlide = totalSlides > 1;

  const feedAssetId = feedAsset?.id || null;
  const storiesAssetId = storiesAsset?.id || null;

  const temAjusteEmAberto = post.status === 'ALTERATION_REQUESTED';

  /**
   * Há uma decisão de fato à espera do cliente.
   *
   * Aprovado e publicado já foram decididos; com ajuste em aberto a vez é da
   * designer. Nos três casos a dupla de botões sai da tela, e um aviso de
   * estado ocupa o lugar.
   */
  const podeDecidir =
    post.status !== 'APPROVED' && post.status !== 'PUBLISHED' && !temAjusteEmAberto;

  /**
   * Quem pode excluir arte, e quando.
   *
   * O papel entra aqui porque os botões vivem sobre as imagens, fora do painel
   * restrito à equipe — sem isto, o cliente veria "Excluir" na própria tela de
   * aprovação. O estado espelha a regra do backend, que recusa remover arte de
   * post aprovado ou publicado: oferecer a ação e devolver erro no clique é
   * pior do que não oferecer, porque parece defeito.
   */
  const podeExcluirArte =
    (isAdmin || isDesigner) && (post.status === 'PENDING' || temAjusteEmAberto);

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
            {rotuloDoStatus(post.status)}
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
                  <span className="font-medium text-white">Designer: {post.assignedDesigner?.name || 'Não atribuído'}</span>
                </div>
                {post.currentVersion?.versionNumber && (
                  <div className="flex items-center gap-2">
                    <div className="px-5 py-2 rounded-full bg-brand-gradient text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_8px_20px_oklch(var(--primary)/0.4)]">
                      <Layers className="w-4 h-4" />
                      Versão {post.currentVersion.versionNumber}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* O briefing é instrução interna de execução, entre quem pediu
                    e quem desenha. O cliente aprova a peça pronta; mostrar o
                    passo a passo só ruidifica a decisão dele. A API também não
                    envia o campo para este papel. */}
                {!isClient && (
                  <div>
                    {/* Recolhido por padrão: quem abre o post costuma vir olhar a
                        arte, não reler a instrução. Fica a um toque de distância
                        para quando for preciso. */}
                    <button
                      type="button"
                      onClick={() => setBriefingAberto((v) => !v)}
                      aria-expanded={briefingAberto}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors group/briefing"
                    >
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover/briefing:text-white transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                        Ver briefing de design
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${briefingAberto ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {briefingAberto && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {/*
                            `whitespace-pre-line` porque o briefing chega com as
                            quebras de linha do arquivo importado, e o HTML as
                            engoliria: a copy de um carrossel virava um bloco
                            único, com "SLIDE 1" e "SLIDE 2" grudados na mesma
                            frase. `pre-line` mantém as quebras e ainda colapsa
                            espaço repetido, que é o que sobra de célula de
                            planilha.
                          */}
                          <p className="text-sm text-zinc-400 leading-relaxed bg-white/2 border border-white/5 rounded-2xl p-5 italic mt-2 whitespace-pre-line">
                            {post.briefing || 'Nenhum briefing fornecido.'}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Legenda do Post</h4>
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
                  {/*
                    Os dois botões saem juntos, e pelo mesmo motivo: com um
                    ajuste em aberto não há decisão a tomar. A bola está com a
                    designer, e a arte na tela é justamente a que o cliente
                    acabou de reprovar — aprová-la agora seria aprovar o que ele
                    pediu para mudar. Voltam quando a nova versão chega e o post
                    retorna para PENDING.

                    É o mesmo tratamento já dado a aprovado e publicado: decisão
                    tomada, botão fora da tela em vez de cinza pedindo clique.
                  */}
                  {podeDecidir && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => updateStatusMutation.mutate({
                          status: 'APPROVED',
                          versionId: post.currentVersionId || undefined
                        })}
                        disabled={decisaoEmAndamento || !post.currentVersionId}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:grayscale"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Aprovar Post
                      </button>
                      <button
                        onClick={() => setIsAdjustmentModalOpen(true)}
                        disabled={decisaoEmAndamento || !post.currentVersionId}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:grayscale"
                      >
                        <AlertCircle className="w-5 h-5" />
                        Solicitar Ajuste
                      </button>
                    </div>
                  )}
                  {!post.currentVersionId && (
                    <p className="text-[10px] text-zinc-500 text-center mt-4">
                      {isClient
                        ? 'A arte ainda não foi enviada. Assim que ela chegar, o botão de aprovar libera.'
                        : 'A aprovação só libera depois que a primeira versão da arte for enviada.'}
                    </p>
                  )}
                  {/* Sem os botões, a tela precisa dizer por que — senão some a
                      ação e não sobra explicação nenhuma. */}
                  {temAjusteEmAberto && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 text-amber-400">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-bold text-sm uppercase tracking-wider">Ajuste solicitado</span>
                      </div>
                      <span className="text-xs text-amber-400/70 text-center">
                        A equipe de design foi avisada. Quando a nova arte chegar,
                        você poderá aprovar ou pedir outro ajuste.
                      </span>
                    </div>
                  )}
                  {post.status === 'APPROVED' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wider">Este post foi aprovado!</span>
                    </div>
                  )}
                  {post.status === 'PUBLISHED' && (
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-violet-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wider">Este post já foi publicado!</span>
                    </div>
                  )}
                  {(post.status === 'APPROVED' || post.status === 'PUBLISHED') && post.statusHistory && (
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

              {/*
                As ações de arte moram no mesmo lugar do painel de decisão do
                cliente, e não mais no rodapé da coluna da arte.

                Lá elas ficavam depois das imagens, que são altas: entregar uma
                arte exigia rolar a página inteira para achar o botão. Aqui cada
                papel encontra o que pode fazer logo abaixo da legenda, sem
                rolagem e no mesmo ponto da tela.

                Com ajuste em aberto, "Enviar nova versão" é o único caminho.
                "Substituir Feed"/"Substituir Stories" trocam a arte da versão
                vigente e não fazem mais nada: não criam versão, não tiram o post
                de ALTERATION_REQUESTED e não avisam o cliente. Atender um ajuste
                por ali já aconteceu em produção — a arte nova entrou, e para
                todo mundo o post continuou parecendo que esperava o design.
                Por isso eles somem enquanto houver ajuste, em vez de conviverem
                com o botão certo: são o caminho silencioso, e a diferença entre
                os três não é visível para quem está só tentando entregar a arte.
              */}
              {(isAdmin || isDesigner) && (
                <div className="mt-10 pt-8 border-t border-white/5">
                  {temAjusteEmAberto ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => setIsNovaVersaoModalOpen(true)}
                        className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                      >
                        <Upload className="w-5 h-5" />
                        Enviar nova versão
                      </button>
                      <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                        Atende o ajuste solicitado e avisa o cliente. Envie só a
                        peça que mudou — a outra é mantida.
                      </p>

                      {/*
                        Nem todo ajuste termina em upload: "remova o formato
                        feed" se resolve removendo. Sem esta saída, atender esse
                        pedido deixava o post preso em ajuste solicitado para
                        sempre, porque o único gatilho de "atendido" era enviar
                        arte.

                        Exige arte no post: mandar o cliente revisar uma tela
                        vazia contradiria o aviso que ele acabou de receber.
                      */}
                      <div className="pt-3 mt-1 border-t border-white/5">
                        {/*
                          Sólido e com brilho, no mesmo peso de "Enviar nova
                          versão": os dois são caminhos igualmente válidos para
                          fechar o ajuste. Em tom translúcido, este parecia um
                          selo de estado — algo que a tela informa — e não uma
                          ação que se clica.
                        */}
                        <button
                          onClick={() => setConfirmandoConclusao(true)}
                          disabled={!post.currentVersionId}
                          className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Marcar ajuste como atendido
                        </button>
                        <p className="text-[11px] text-zinc-500 text-center leading-relaxed mt-2">
                          {post.currentVersionId
                            ? 'Para ajustes que não geram arte nova, como remover um formato.'
                            : 'O post precisa de pelo menos uma arte para o cliente revisar.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    (feedUrls.length > 0 || storiesUrl) && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        {feedUrls.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedAssetId(feedAssetId || 'feed-placeholder');
                              setSelectedAssetType('FEED');
                              setIsReplaceAssetModalOpen(true);
                            }}
                            className="flex-1 py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 transition-all"
                          >
                            <RotateCw className="w-4 h-4" />
                            Substituir Feed
                          </button>
                        )}

                        {storiesUrl && (
                          <button
                            onClick={() => {
                              setSelectedAssetId(storiesAssetId || 'stories-placeholder');
                              setSelectedAssetType('STORIES');
                              setIsReplaceAssetModalOpen(true);
                            }}
                            className="flex-1 py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 transition-all"
                          >
                            <RotateCw className="w-4 h-4" />
                            Substituir Stories
                          </button>
                        )}
                      </div>
                    )
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
              {comments && comments.length > 0 ? (
                <>
                  <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Histórico de Comentários
                    </span>
                  </div>
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold shrink-0">
                        {comment.authorUser?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{comment.authorUser?.name || 'User'}</span>
                            {comment.postVersion?.versionNumber && (
                              <span className="px-2 py-0.5 rounded bg-brand-gradient text-white text-[9px] font-bold uppercase tracking-tighter shadow-sm">
                                Versão {comment.postVersion.versionNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500">
                              {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="inline-block px-2 py-0.5 rounded bg-black/30 border border-white/5 text-[10px] font-bold text-zinc-400">
                            {comment.target === 'GENERAL' ? 'GERAL' : comment.target}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-12 text-center text-zinc-600">
                  <p className="text-sm">Nenhum comentário por enquanto.</p>
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
            {/* Art preview — Desktop */}
            <div className="hidden lg:flex flex-col gap-10">
              {feedUrls.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                      Arte do Feed
                      {isCarousel && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold border border-primary/30">
                          CARROSSEL {feedUrls.length} imgs
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDownload(feedUrls[0], 'feed')}
                        className="flex items-center gap-2 text-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider group"
                      >
                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Baixar HD
                      </button>
                      {/* Sobre a arte, e não escondido no painel: quem decide
                          excluir está olhando para a imagem. */}
                      {podeExcluirArte && (
                        <button
                          onClick={() => setPecaParaExcluir('FEED')}
                          className="py-2.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  {isCarousel ? (
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar">
                      {feedUrls.map((url, i) => (
                        <div key={i} className="min-w-[80%] snap-center rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/20 group cursor-zoom-in">
                          <img src={url} className="w-full h-auto transition-transform duration-700 group-hover:scale-105" alt={`Feed ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/20 group cursor-zoom-in">
                      <img src={feedUrls[0]} className="w-full h-auto transition-transform duration-700 group-hover:scale-105" alt="Arte Feed" />
                    </div>
                  )}
                </div>
              )}

              {storiesUrl && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Arte do Stories</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDownload(storiesUrl, 'stories')}
                        className="flex items-center gap-2 text-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider group"
                      >
                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Baixar HD
                      </button>
                      {podeExcluirArte && (
                        <button
                          onClick={() => setPecaParaExcluir('STORIES')}
                          className="py-2.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/20 aspect-[9/16] group cursor-zoom-in">
                    <img src={storiesUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Arte Stories" />
                  </div>
                </div>
              )}

              {feedUrls.length === 0 && !storiesUrl && (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                  <p className="text-zinc-600 font-medium">Nenhuma arte disponível para esta versão.</p>
                </div>
              )}
            </div>

            {/* Art preview — Mobile */}
            <div className="lg:hidden">
              <div className="relative group/carousel">
                {/* Cada slide é mais estreito que a tela e o trilho tem folga à
                    direita: sobra um pedaço da próxima arte na lateral, que é o
                    único aviso de que existe mais de uma imagem antes de o dedo
                    arrastar. Com um slide só a folga sai, senão a arte única
                    ficaria desalinhada à toa.

                    `snap-start` em vez de `snap-center` de propósito: centrado,
                    o último slide não alcança o próprio ponto de parada e o
                    carrossel volta sozinho. */}
                <div
                  ref={trilhoRef}
                  onScroll={aoRolarCarrossel}
                  className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 pb-4 ${temMaisDeUmSlide ? 'pr-12' : ''}`}
                >
                  {feedUrls.map((url, i) => (
                    <div
                      key={i}
                      className={`${temMaisDeUmSlide ? 'w-[calc(100%-3rem)]' : 'w-full'} shrink-0 snap-start space-y-2 relative`}
                    >
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {isCarousel ? `Feed ${i + 1}/${feedUrls.length}` : 'Arte do Feed'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDownload(url, `feed-${i + 1}`)} className="flex items-center gap-1.5 text-primary hover:text-white transition-colors text-[10px] font-bold uppercase">
                            <Download className="w-3.5 h-3.5" />
                            Baixar HD
                          </button>
                          {/* Só no primeiro slide: o feed sai inteiro, então
                              repetir o botão em cada imagem sugeriria que dá
                              para excluir slide a slide. */}
                          {podeExcluirArte && i === 0 && (
                            <button
                              onClick={() => setPecaParaExcluir('FEED')}
                              className="py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-black/20">
                        <img src={url} className="w-full h-auto" alt={`Feed ${i + 1}`} />
                      </div>
                    </div>
                  ))}

                  {storiesUrl && (
                    <div
                      className={`${temMaisDeUmSlide ? 'w-[calc(100%-3rem)]' : 'w-full'} shrink-0 snap-start space-y-2 relative`}
                    >
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Arte do Stories</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDownload(storiesUrl, 'stories')} className="flex items-center gap-1.5 text-primary hover:text-white transition-colors text-[10px] font-bold uppercase">
                            <Download className="w-3.5 h-3.5" />
                            Baixar HD
                          </button>
                          {podeExcluirArte && (
                            <button
                              onClick={() => setPecaParaExcluir('STORIES')}
                              className="py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-black/20 aspect-[9/16]">
                        <img src={storiesUrl} className="w-full h-full object-cover" alt="Arte Stories" />
                      </div>
                    </div>
                  )}

                  {feedUrls.length === 0 && !storiesUrl && (
                    <div className="w-full shrink-0 py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                      <p className="text-zinc-600 text-sm">Nenhuma arte disponível para esta versão.</p>
                    </div>
                  )}
                </div>

                {/* Some no último slide: uma seta que aponta para o nada sugere
                    que ainda falta arte a ver. */}
                {temMaisDeUmSlide && slideAtual < totalSlides - 1 && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none animate-pulse">
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 p-2 rounded-full text-white/70 shadow-2xl">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>

              {temMaisDeUmSlide && (
                <div className="flex justify-center gap-2 mt-2">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => irParaSlide(i)}
                      aria-label={`Ver arte ${i + 1} de ${totalSlides}`}
                      aria-current={i === slideAtual}
                      // Alvo de toque de 24px em volta de uma bolinha de 8px: no
                      // dedo, acertar 8px não acontece.
                      className="p-2 -m-1 flex items-center justify-center"
                    >
                      <span
                        className={`w-2 h-2 rounded-full block transition-all ${i === slideAtual
                          ? 'bg-primary shadow-[0_0_10px_oklch(var(--primary)/0.5)] scale-125'
                          : 'bg-white/20'
                          }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

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
          assetType={selectedAssetType}
          postId={postId!}
          campaignId={campId!}
          versionId={post.currentVersionId ?? undefined}
          currentFeedUrls={feedUrls}
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

      {/*
        O mesmo modal do card, de propósito: é o caminho que cria uma versão de
        verdade, tira o post do ajuste e avisa o cliente. Duplicar a tela aqui
        seria duplicar também a chance de uma das duas parar de notificar.
      */}
      <UploadVersionModal
        isOpen={isNovaVersaoModalOpen}
        onClose={() => setIsNovaVersaoModalOpen(false)}
        postId={postId!}
        campaignId={campId!}
      />

      <ConfirmDialog
        isOpen={pecaParaExcluir !== null}
        onClose={() => setPecaParaExcluir(null)}
        onConfirm={() => pecaParaExcluir && removerPecaMutation.mutate(pecaParaExcluir)}
        title={
          pecaParaExcluir === 'STORIES'
            ? 'Excluir a arte de stories?'
            : 'Excluir a arte de feed?'
        }
        description={
          <>
            {pecaParaExcluir === 'FEED' && feedUrls.length > 1 ? (
              <>
                As <strong>{feedUrls.length} imagens do carrossel</strong> saem juntas —
                o feed é excluído inteiro.
              </>
            ) : (
              <>A arte deixa de aparecer no post.</>
            )}{' '}
            {/* Dito explicitamente porque "excluir" costuma sugerir perda
                definitiva, e aqui não é o caso: o histórico continua completo. */}
            O histórico é preservado: as versões anteriores continuam mostrando
            a arte que o cliente já viu. O cliente não é avisado agora — quando
            você enviar a arte nova, ele recebe o aviso normalmente.
          </>
        }
        confirmLabel="Excluir arte"
        confirmingLabel="Excluindo..."
        isConfirming={removerPecaMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmandoConclusao}
        onClose={() => setConfirmandoConclusao(false)}
        onConfirm={() => concluirAjusteMutation.mutate()}
        title="Marcar ajuste como atendido?"
        description={
          <>
            Confirme que o que o cliente pediu já foi feito. O post volta a
            aguardar aprovação e o cliente é avisado de que o ajuste foi
            concluído.
            {/* Dito porque este caminho não tem campo de observação: o cliente
                não recebe explicação do que mudou, só o aviso. */}
            {' '}Ele não recebe detalhes do que mudou — vai conferir direto no post.
          </>
        }
        confirmLabel="Confirmar conclusão"
        confirmingLabel="Concluindo..."
        isConfirming={concluirAjusteMutation.isPending}
      />
    </div>
  );
}
