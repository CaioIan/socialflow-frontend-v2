import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { muralService } from '../api/mural-service';
import { MuralCarousel } from './mural-carousel';

/**
 * Leitura compartilhada do mural, tanto na tela inicial quanto acima da lista
 * de organizações. A origem só precisa aparecer em cada aviso quando há mais
 * de uma empresa possível; globais se identificam sempre.
 */
export function MuralFeed() {
  const { user, organizations } = useAuthStore();
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['mural'],
    queryFn: muralService.listar,
  });

  const showOrganizationBadge = user?.role === 'ADMIN' || organizations.length > 1;

  return (
    <MuralCarousel
      itens={itens}
      isLoading={isLoading}
      showOrganizationBadge={showOrganizationBadge}
    />
  );
}
