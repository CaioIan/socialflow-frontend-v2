import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '@/features/organizations/api/organizations-service';

export function useOrganizationAccess(organizationId: string | undefined) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: organizationsService.getAll,
    enabled: !!user?.id && !isAdmin,
  });

  useEffect(() => {
    if (!user || !organizationId) return;

    // ADMINs podem acessar qualquer organização
    if (isAdmin) return;

    // Verificar se o usuário tem acesso a essa organização
    const hasAccess = organizations.some(org => org.id === organizationId);

    if (!hasAccess) {
      navigate('/organizations', { replace: true });
    }
  }, [organizationId, organizations, user, isAdmin, navigate]);

  return {
    hasAccess: isAdmin || organizations.some(org => org.id === organizationId),
    isLoading: !isAdmin && organizations.length === 0 && !!user?.id,
  };
}
