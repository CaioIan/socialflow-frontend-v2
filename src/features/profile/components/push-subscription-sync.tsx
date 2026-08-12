import { useEffect } from 'react';
import { sincronizarInscricaoPushExistente } from '@/shared/lib/push-notifications';
import { useAuthStore } from '@/stores/use-auth-store';

export function PushSubscriptionSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    sincronizarInscricaoPushExistente().catch(() => {
      // Sincronização silenciosa: a falha não interfere na sessão nem nos
      // e-mails. O controle do perfil mostra o estado quando o usuário o abrir.
    });
  }, [isAuthenticated, userId]);

  return null;
}
