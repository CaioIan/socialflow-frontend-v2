import type { Area } from 'react-easy-crop';

/** Lado do quadrado final, em pixels. */
const LADO = 512;

function carregar(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Não foi possível ler a imagem')));
    // A origem é um blob: local; sem isto o canvas fica "sujo" e o toBlob falha.
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Aplica o recorte escolhido e devolve um JPEG quadrado de lado fixo.
 *
 * Normalizar o tamanho aqui evita subir o original inteiro: o avatar é exibido
 * com no máximo 112px, então 512 já cobre telas retina com folga.
 */
export async function recortarImagem(urlDaImagem: string, area: Area): Promise<Blob> {
  const imagem = await carregar(urlDaImagem);
  const canvas = document.createElement('canvas');
  canvas.width = LADO;
  canvas.height = LADO;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador');

  ctx.drawImage(
    imagem,
    area.x, area.y, area.width, area.height,
    0, 0, LADO, LADO,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem recortada'))),
      'image/jpeg',
      0.9,
    );
  });
}
