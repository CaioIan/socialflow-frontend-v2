import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { muralService } from '../api/mural-service';
import { MuralCarousel } from './mural-carousel';

/**
 * Leitura compartilhada do mural, tanto na tela inicial quanto acima da lista
 * de organizações. A API decide quais avisos globais ou direcionados cada
 * pessoa recebe; o card apresenta somente o conteúdo do comunicado.
 */
export function MuralFeed() {
  const { user } = useAuthStore();
  const { data: itens = [], isLoading } = useQuery({
    // O mural é autorizado por usuário. Uma chave compartilhada permitia que,
    // após trocar de conta sem recarregar a aba, o React Query reaproveitasse
    // por alguns minutos os avisos da sessão anterior.
    queryKey: ['mural', user?.id],
    queryFn: muralService.listar,
    enabled: Boolean(user?.id),
  });

  return (
    <MuralCarousel
      itens={itens}
      isLoading={isLoading}
      viewerName={user?.name}
    />
  );
}
