import imageCompression from 'browser-image-compression';

/**
 * Comprime uma imagem antes do upload para caber dentro dos limites da Vercel (4.5MB).
 *
 * - Se o arquivo não for uma imagem (ex: PDF, vídeo), retorna o original sem alteração.
 * - Se a imagem já estiver abaixo do tamanho alvo, a compressão será mínima.
 * - A compressão é feita no browser via Web Worker (não trava a UI).
 *
 * @param file       – Arquivo original selecionado pelo usuário
 * @param maxSizeMB  – Tamanho máximo em MB (padrão: 3.8 para ter margem dentro dos 4.5MB da Vercel)
 * @returns            Arquivo comprimido (ou original se não for imagem)
 */
export async function compressImageIfNeeded(
  file: File,
  maxSizeMB: number = 3.8,
): Promise<File> {
  // Só comprime imagens
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Se já estiver dentro do limite, retorna sem comprimir
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= maxSizeMB) {
    return file;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 4096,       // Mantém resolução alta o suficiente para redes sociais
    useWebWorker: true,           // Não trava a UI durante a compressão
    preserveExif: false,          // Remove metadados para reduzir tamanho
    fileType: file.type as string, // Mantém o formato original (JPG→JPG, PNG→PNG)
  });

  // browser-image-compression retorna Blob; converter de volta para File
  // mantendo o nome original para o backend salvar corretamente
  return new File([compressed], file.name, {
    type: compressed.type,
    lastModified: Date.now(),
  });
}
