import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { authService } from '@/features/auth/api/auth-service';

/**
 * Mantém o contexto de organização do token alinhado com a organização da URL.
 *
 * Campanhas e posts são sempre listados no escopo de uma organização, e o
 * backend usa a organização do token — não a da URL. Sem essa sincronização,
 * abrir `/organizations/:id/...` direto (link salvo, refresh, voltar do
 * navegador) mostraria os dados da organização anterior, ou nenhum dado quando
 * não há nenhuma selecionada.
 *
 * A troca é feita pelo endpoint de seleção, que revalida no servidor se o
 * usuário pertence à organização — quem não pertence é mandado de volta para a
 * lista, sem depender de checagem no cliente.
 */
export function useOrganizationAccess(organizationId: string | undefined) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, currentOrganizationId, setCurrentOrganization } = useAuthStore();

  // Evita disparar a troca repetidas vezes enquanto a requisição está em voo.
  const syncingRef = useRef<string | null>(null);

  const isSynced = currentOrganizationId === organizationId;

  useEffect(() => {
    if (!user || !organizationId) return;
    if (isSynced) return;
    if (syncingRef.current === organizationId) return;

    syncingRef.current = organizationId;

    authService
      .selectOrganization(organizationId)
      .then(() => {
        setCurrentOrganization(organizationId);
        // O token mudou de organização: o cache anterior é de outro escopo.
        queryClient.invalidateQueries();
      })
      .catch(() => {
        navigate('/organizations', { replace: true });
      })
      .finally(() => {
        syncingRef.current = null;
      });
  }, [organizationId, isSynced, user, setCurrentOrganization, queryClient, navigate]);

  return {
    /** Só libera as queries da página depois que o token aponta para a organização certa. */
    hasAccess: !!organizationId && isSynced,
    isLoading: !!organizationId && !isSynced,
  };
}
