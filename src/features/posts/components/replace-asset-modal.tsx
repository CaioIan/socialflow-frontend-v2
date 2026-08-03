import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Loader2, Upload, X } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import api from '@/api/axios';
import { postsService } from '../api/posts-service';

/** Teto do carrossel no Instagram. */
const MAXIMO_DE_IMAGENS = 10;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Arte específica a substituir. Usado só no caminho de Stories. */
  assetId?: string;
  assetType: 'FEED' | 'STORIES';
  postId: string;
  campaignId: string;
  /** Versão atual do post — é nela que a lista de feed é reescrita. */
  versionId?: string;
  /** Artes de feed que já estão no post, para mostrar o que sai. */
  currentFeedUrls?: string[];
  currentImageUrl?: string;
}

/**
 * Troca as artes de um post.
 *
 * No feed aceita várias imagens e **substitui a lista inteira** — é o caminho
 * para consertar um post que subiu com uma imagem só e deveria ser carrossel.
 * A troca acontece na versão atual, não numa nova: trocar o arquivo não é o
 * mesmo que mandar uma versão nova para o cliente reaprovar.
 *
 * Stories continua com uma imagem só, porque o formato não tem carrossel.
 */
export function ReplaceAssetModal({
  isOpen,
  onClose,
  assetId,
  assetType,
  postId,
  campaignId,
  versionId,
  currentFeedUrls = [],
  currentImageUrl,
}: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [erro, setErro] = useState<string | undefined>(undefined);
  const [concluido, setConcluido] = useState(false);

  const ehCarrossel = assetType === 'FEED';

  // As URLs de blob só saem da memória quando revogadas.
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const limpar = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setArquivos([]);
    setPreviews([]);
    setErro(undefined);
  };

  const enviar = useMutation({
    mutationFn: async () => {
      if (ehCarrossel) {
        if (!versionId) {
          throw new Error('Este post ainda não tem uma versão para atualizar');
        }

        // Sequencial de propósito: o Cloudinary limita uploads simultâneos, e a
        // ordem dos envios é a ordem dos slides do carrossel.
        const urls: string[] = [];
        for (const arquivo of arquivos) {
          const asset = await postsService.uploadAsset(arquivo, postId, 'FEED');
          urls.push(asset.cloudinaryUrl);
        }

        return await postsService.replaceFeedUrls({ versionId, feedUrls: urls });
      }

      if (!assetId) throw new Error('Arte não identificada');

      const corpo = new FormData();
      corpo.append('file', arquivos[0]);
      const response = await api.patch(`/assets/${assetId}`, corpo);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId], refetchType: 'all' });
      setConcluido(true);
      setTimeout(() => {
        setConcluido(false);
        limpar();
        onClose();
      }, 1400);
    },
    onError: (e) =>
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar as imagens'),
  });

  function aoEscolher(lista: FileList | null) {
    if (!lista?.length) return;

    const escolhidos = Array.from(lista);

    if (ehCarrossel && escolhidos.length > MAXIMO_DE_IMAGENS) {
      setErro(`O carrossel aceita no máximo ${MAXIMO_DE_IMAGENS} imagens.`);
      return;
    }

    previews.forEach((url) => URL.revokeObjectURL(url));
    const novos = ehCarrossel ? escolhidos : escolhidos.slice(0, 1);
    setArquivos(novos);
    setPreviews(novos.map((f) => URL.createObjectURL(f)));
    setErro(undefined);
  }

  function remover(indice: number) {
    URL.revokeObjectURL(previews[indice]);
    setArquivos((a) => a.filter((_, i) => i !== indice));
    setPreviews((p) => p.filter((_, i) => i !== indice));
  }

  const proporcao = ehCarrossel ? 'aspect-square' : 'aspect-9/16';
  const rotulo = ehCarrossel ? 'artes do Feed' : 'arte do Stories';
  const atuais = ehCarrossel ? currentFeedUrls : currentImageUrl ? [currentImageUrl] : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !enviar.isPending && onClose()}
      title={`Substituir ${rotulo}`}
      className="max-w-2xl"
    >
      {concluido ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Artes atualizadas</h3>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">
                {ehCarrossel ? 'As imagens enviadas substituem o feed inteiro' : 'Substituir imagem'}
              </p>
              <p className="text-xs text-blue-300/80 mt-1">
                {ehCarrossel
                  ? `Escolha até ${MAXIMO_DE_IMAGENS} imagens. A ordem de seleção é a ordem dos slides, e as artes atuais do feed saem do lugar.`
                  : 'Stories não tem carrossel: só uma imagem.'}
              </p>
            </div>
          </div>

          {atuais.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                {atuais.length === 1 ? 'Arte atual' : `Artes atuais (${atuais.length})`}
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {atuais.map((url) => (
                  <div
                    key={url}
                    className={`relative shrink-0 w-24 ${proporcao} rounded-xl overflow-hidden border border-white/10 opacity-50`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              {previews.length > 0
                ? `Novas (${previews.length}${ehCarrossel ? ` de ${MAXIMO_DE_IMAGENS}` : ''})`
                : 'Novas'}
            </span>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple={ehCarrossel}
              onChange={(e) => {
                aoEscolher(e.target.files);
                // Permite reescolher os mesmos arquivos depois de limpar.
                e.target.value = '';
              }}
              className="hidden"
              disabled={enviar.isPending}
            />

            {previews.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {previews.map((url, i) => (
                    <div key={url} className="relative group">
                      <div className={`relative w-full ${proporcao} rounded-xl overflow-hidden border-2 border-primary/50`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {ehCarrossel && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remover(i)}
                        disabled={enviar.isPending}
                        title="Remover"
                        aria-label={`Remover imagem ${i + 1}`}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-zinc-900 border border-white/20 text-zinc-400 hover:text-red-400 hover:border-red-500/50 flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={enviar.isPending}
                  className="text-xs font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Escolher outras
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={enviar.isPending}
                className="w-full bg-white/5 border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-white/[0.07] rounded-2xl px-4 py-10 text-center transition-all disabled:opacity-50"
              >
                <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <span className="text-xs text-zinc-500 block">
                  {ehCarrossel ? 'Selecione uma ou várias imagens' : 'Selecione o arquivo'}
                </span>
              </button>
            )}
          </div>

          {erro && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
              {erro}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={enviar.isPending}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => enviar.mutate()}
              disabled={arquivos.length === 0 || enviar.isPending || (ehCarrossel && !versionId)}
              className="flex-[2] bg-brand-gradient hover:opacity-90 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_oklch(var(--primary)/0.3)] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 text-sm"
            >
              {enviar.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {ehCarrossel && arquivos.length > 1
                    ? `Substituir por ${arquivos.length} imagens`
                    : 'Substituir'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
