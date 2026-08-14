import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2 } from 'lucide-react';
import { postsService } from '../api/posts-service';
import { useToastStore } from '@/stores/use-toast-store';
import { getApiErrorMessage } from '@/api/api-error';

interface MissingFormatDropzoneProps {
  postId: string;
  campaignId: string;
  format: 'FEED' | 'STORIES';
}

/**
 * Envia de volta um formato que o post não tem mais.
 *
 * Existe porque excluir uma peça deixou de ser definitivo: o cliente pede para
 * tirar o feed, muda de ideia, e não havia caminho para repor só aquele
 * formato — "Enviar nova versão" resolve, mas é um modal com os dois campos
 * para uma decisão que já está tomada.
 *
 * O envio manda **apenas** este formato. A peça que o post ainda tem é herdada
 * pela versão nova no backend, então repor o feed não mexe no stories que já
 * estava aprovado.
 */
export function MissingFormatDropzone({
  postId,
  campaignId,
  format,
}: MissingFormatDropzoneProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);

  const ehFeed = format === 'FEED';

  const mutation = useMutation({
    mutationFn: async (arquivos: File[]) => {
      // Stories é uma peça só. Se vierem vários por arrasto, o primeiro vale —
      // recusar o envio inteiro por causa do excesso seria mais irritante do
      // que resolver.
      const selecionados = ehFeed ? arquivos : arquivos.slice(0, 1);

      const urls: string[] = [];
      for (let i = 0; i < selecionados.length; i++) {
        setProgresso(
          selecionados.length > 1
            ? `Enviando ${i + 1} de ${selecionados.length}...`
            : 'Enviando...',
        );
        const asset = await postsService.uploadAsset(selecionados[i], postId, format);
        urls.push(asset.cloudinaryUrl);
      }

      setProgresso('Processando...');
      return postsService.uploadVersion({
        postId,
        feedUrls: ehFeed ? urls : [],
        storiesUrl: ehFeed ? undefined : urls[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['designer-dashboard'] });
      setProgresso(null);
      addToast(ehFeed ? 'Arte de feed enviada.' : 'Arte de stories enviada.', 'success');
    },
    onError: (erro: unknown) => {
      setProgresso(null);
      addToast(getApiErrorMessage(erro, 'Erro ao enviar a arte.'), 'error');
    },
  });

  const enviar = (lista: FileList | null) => {
    const arquivos = Array.from(lista ?? []).filter((a) => a.type.startsWith('image/'));
    if (arquivos.length === 0) return;
    mutation.mutate(arquivos);
  };

  const ocupado = mutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {ehFeed ? 'Arte do Feed' : 'Arte do Stories'}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          Sem arte
        </span>
      </div>

      <button
        type="button"
        disabled={ocupado}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!ocupado) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (!ocupado) enviar(e.dataTransfer.files);
        }}
        className={`w-full rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 text-center px-6 ${
          ehFeed ? 'py-20' : 'aspect-[9/16]'
        } ${
          arrastando
            ? 'border-primary bg-primary/10'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
        } disabled:opacity-60 disabled:cursor-wait`}
      >
        {ocupado ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-zinc-400">{progresso}</span>
          </>
        ) : (
          <>
            <ImagePlus className="w-8 h-8 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-300">
              {ehFeed ? 'Enviar arte de feed' : 'Enviar arte de stories'}
            </span>
            <span className="text-xs text-zinc-500 leading-relaxed">
              Arraste aqui ou clique para escolher.
              <br />
              {ehFeed
                ? 'Uma imagem para post estático, várias para carrossel.'
                : 'Uma imagem.'}
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={ehFeed}
        className="hidden"
        onChange={(e) => {
          enviar(e.target.files);
          // Permite reenviar o mesmo arquivo depois de um erro.
          e.target.value = '';
        }}
      />
    </div>
  );
}
