import type { PostStatus } from '../api/posts-service';

/**
 * Fonte única dos rótulos de status.
 *
 * Os textos viviam só dentro da listagem de posts, e a tela de detalhe acabava
 * mostrando o enum cru ("Status: ALTERATION_REQUESTED") para o cliente.
 */
export const ROTULO_DO_STATUS: Record<PostStatus, string> = {
  PENDING: 'Pendente',
  ALTERATION_REQUESTED: 'Alteração Solicitada',
  APPROVED: 'Aprovado',
  PUBLISHED: 'Publicado',
  FAILED: 'Falha ao publicar',
  CANCELLED: 'Cancelado',
};

/** Nunca devolve vazio: status desconhecido vira o texto do próprio código. */
export function rotuloDoStatus(status: PostStatus | string): string {
  return ROTULO_DO_STATUS[status as PostStatus] ?? status;
}
