import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { profileService } from './profile-service';

/**
 * Perfil de quem está logado, para o cabeçalho, o menu lateral e a tela de
 * perfil.
 *
 * Consulta própria em vez de campos novos no `/auth/me`: o caminho de
 * autenticação é o mais sensível da aplicação, e uma foto de perfil não
 * justifica mexer nele. O React Query serve a mesma resposta às três telas a
 * partir de uma requisição só.
 */
export function useProfile() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['profile'],
    queryFn: profileService.get,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
