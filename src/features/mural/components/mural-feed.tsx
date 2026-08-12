import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { muralService } from '../api/mural-service';
import { MuralCarousel } from './mural-carousel';

/**
 * Leitura compartilhada do mural, tanto na tela inicial quanto acima da lista
 * de organizações. Todo aviso identifica sua origem: os globais usam a marca
 * do SocialFlow e os direcionados mostram o nome e a logo da organização.
 *
 * A badge não depende da lista de organizações mantida no estado de login.
 * Essa lista não é persistida ao recarregar a página e, por isso, fazia a
 * origem desaparecer para CLIENT e DESIGNER mesmo quando a API devolvia o
 * aviso corretamente.
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
      showOrganizationBadge
      viewerName={user?.name}
    />
  );
}
