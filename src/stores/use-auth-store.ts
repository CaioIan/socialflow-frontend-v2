import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Organization } from '../features/auth/types';

interface AuthState {
  user: User | null;
  organizations: Organization[];
  currentOrganizationId: string | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;

  // Actions
  setAuth: (user: User, organizations: Organization[]) => void;
  setUser: (user: User) => void;
  setIsCheckingAuth: (status: boolean) => void;
  setCurrentOrganization: (organizationId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organizations: [],
      currentOrganizationId: null,
      isAuthenticated: false,
      isCheckingAuth: true,

      setAuth: (user, organizations) =>
        set({
          user,
          organizations,
          isAuthenticated: true,
          isCheckingAuth: false,
          currentOrganizationId: organizations.length === 1 ? organizations[0].organizationId : null
        }),

      setUser: (user) => set({ user, isAuthenticated: true, isCheckingAuth: false }),

      setIsCheckingAuth: (status) => set({ isCheckingAuth: status }),

      setCurrentOrganization: (organizationId) =>
        set({ currentOrganizationId: organizationId }),

      logout: () =>
        set({
          user: null,
          organizations: [],
          currentOrganizationId: null,
          isAuthenticated: false,
          isCheckingAuth: false
        }),
    }),
    {
      name: 'socialflow-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentOrganizationId: state.currentOrganizationId
      }), // Persistir apenas o ID da organização para manter o contexto entre recargas
    }
  )
);
