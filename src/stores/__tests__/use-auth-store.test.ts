import { beforeEach, describe, expect, it } from 'vitest';
import type { Organization, User } from '@/features/auth/types';
import { useAuthStore } from '../use-auth-store';

const user: User = {
  id: 'client-1',
  email: 'cliente@socialflow.test',
  name: 'Cliente',
  role: 'CLIENT',
  isActive: true,
};

const organizations: Organization[] = [
  {
    id: 'vinculo-1',
    organizationId: 'org-1',
    name: 'Organização 1',
    slug: 'organizacao-1',
    role: 'CLIENT',
    isActive: true,
  },
  {
    id: 'vinculo-2',
    organizationId: 'org-2',
    name: 'Organização 2',
    slug: 'organizacao-2',
    role: 'CLIENT',
    isActive: true,
  },
];

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('entra sem contexto quando existem várias organizações', () => {
    useAuthStore.getState().setAuth(user, organizations);

    expect(useAuthStore.getState().currentOrganizationId).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('adota automaticamente a única organização disponível', () => {
    useAuthStore.getState().setAuth(user, organizations.slice(0, 1));

    expect(useAuthStore.getState().currentOrganizationId).toBe('org-1');
  });

  it('restaura a organização presente no token da sessão', () => {
    useAuthStore.getState().setAuth(user, organizations.slice(0, 1));

    useAuthStore.getState().setUser({ ...user, organizationId: 'org-2' });

    expect(useAuthStore.getState().currentOrganizationId).toBe('org-2');
  });

  it('limpa um contexto local antigo quando o token não possui organização', () => {
    useAuthStore.getState().setAuth(user, organizations.slice(0, 1));

    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().currentOrganizationId).toBeNull();
  });

  it('mantém o estado padrão quando não existe organização vinculada', () => {
    useAuthStore.getState().setAuth({ ...user, role: 'ADMIN' }, []);

    expect(useAuthStore.getState().currentOrganizationId).toBeNull();
  });
});
