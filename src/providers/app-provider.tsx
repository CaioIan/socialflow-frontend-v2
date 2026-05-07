import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { authService } from '@/features/auth/api/auth-service';
import { useAuthStore } from '@/stores/use-auth-store';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthBoot({ children }: { children: ReactNode }) {
  const { setUser, setIsCheckingAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    async function boot() {
      try {
        const data = await authService.me();
        setUser(data.user);
      } catch (error) {
        setIsCheckingAuth(false);
      }
    }

    boot();
  }, [setUser, setIsCheckingAuth]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin loader-gradient" />
      </div>
    );
  }

  return <>{children}</>;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBoot>
        {children}
      </AuthBoot>
    </QueryClientProvider>
  );
}
