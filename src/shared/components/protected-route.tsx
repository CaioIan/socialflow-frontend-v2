import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redireciona para login salvando a rota que o usuário tentou acessar
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallbackPath = user.role === 'ADMIN' ? '/mural/gerenciar' : '/mural';
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
