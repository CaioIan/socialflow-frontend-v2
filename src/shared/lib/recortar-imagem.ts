import type { Area } from 'react-easy-crop';

/** Saída do avatar: quadrado. Exibido com no máximo 112px, 512 cobre retina. */
export const RECORTE_AVATAR = { largura: 512, altura: 512 } as const;

/**
 * Saída do mural: 16:9.
 *
 * 1280x720 é a resolução recomendada ao administrador — normalizar aqui garante
 * que toda imagem do mural chegue no mesmo tamanho, independente do original.
 */
export const RECORTE_MURAL = { largura: 1280, altura: 720 } as const;

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
 * Aplica o recorte escolhido e devolve um JPEG no tamanho pedido.
 *
 * Normalizar o tamanho aqui evita subir o original inteiro, e garante que o
 * servidor receba exatamente a proporção que ele exige — sem isso, a validação
 * do backend recusaria imagens que o usuário acabou de enquadrar na tela.
 */
export async function recortarImagem(
  urlDaImagem: string,
  area: Area,
  destino: { largura: number; altura: number } = RECORTE_AVATAR,
): Promise<Blob> {
  const imagem = await carregar(urlDaImagem);
  const canvas = document.createElement('canvas');
  canvas.width = destino.largura;
  canvas.height = destino.altura;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador');

  ctx.drawImage(
    imagem,
    area.x, area.y, area.width, area.height,
    0, 0, destino.largura, destino.altura,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem recortada'))),
      'image/jpeg',
      0.9,
    );
  });
}
