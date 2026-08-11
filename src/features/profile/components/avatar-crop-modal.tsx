import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, ZoomIn } from 'lucide-react';
import { Modal } from '@/shared/components/modal';
import { recortarImagem } from '@/shared/lib/recortar-imagem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** `blob:` da imagem escolhida; quem abre o modal cria e revoga essa URL. */
  imagemUrl: string | undefined;
  onConfirm: (recortada: Blob) => void;
  isConfirming?: boolean;
}

export function AvatarCropModal({
  isOpen,
  onClose,
  imagemUrl,
  onConfirm,
  isConfirming,
}: Props) {
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | undefined>(undefined);
  const [erro, setErro] = useState<string | undefined>(undefined);
  const [recortando, setRecortando] = useState(false);

  // A área vem em pixels da imagem original, não da tela — é ela que o canvas
  // precisa para recortar sem depender do tamanho do preview.
  const aoTerminarDeArrastar = useCallback((_: Area, emPixels: Area) => {
    setArea(emPixels);
  }, []);

  const confirmar = async () => {
    if (!imagemUrl || !area || isConfirming) return;

    setRecortando(true);
    setErro(undefined);
    try {
      onConfirm(await recortarImagem(imagemUrl, area));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível recortar a imagem');
    } finally {
      setRecortando(false);
    }
  };

  const ocupado = recortando || isConfirming;

  return (
    <Modal
      // `key` zera posição e zoom a cada imagem nova: herdar o enquadramento da
      // foto anterior deixaria a nova cortada num lugar que ninguém escolheu.
      key={imagemUrl ?? 'vazio'}
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar foto"
      className="max-w-md"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          Arraste para posicionar e use o controle para aproximar.
        </p>

        <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black/60 border border-white/10">
          {imagemUrl && (
            <Cropper
              image={imagemUrl}
              crop={posicao}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setPosicao}
              onZoomChange={setZoom}
              onCropComplete={aoTerminarDeArrastar}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Aproximar"
            className="w-full accent-[oklch(var(--primary))]"
          />
        </div>

        {erro && (
          <p className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
            {erro}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={confirmar}
            disabled={!area || ocupado}
            className="w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
            {ocupado ? 'Salvando...' : 'Salvar foto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={ocupado}
            className="w-full py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
