import api from '@/api/axios';
import type { User } from '../../auth/types';
import type { Organization } from '@/features/organizations/types';

export interface UserWithOrgs extends User {
  organizations: {
    organization: Organization;
    role: string;
  }[];
}

export const usersService = {
  getAll: async (role?: string) => {
    const response = await api.get<UserWithOrgs[]>('/users', { params: { role } });
    return response.data;
  },

  create: async (data: { email: string; password: string; name: string; role: string }) => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  /**
   * Desativa sem apagar: o usuário perde o acesso e todo o histórico dele —
   * aprovações, comentários, artes enviadas — continua no lugar.
   */
  deactivate: async (id: string) => {
    await api.patch(`/users/${id}/deactivate`);
  },

  reactivate: async (id: string) => {
    await api.patch(`/users/${id}/reactivate`);
  },

  linkToOrganization: async (data: { userId: string; organizationId: string; role: string }) => {
    const response = await api.post('/users/link', data);
    return response.data;
  },

  /**
   * ⚠️ O e-mail é a credencial de login: trocá-lo muda por onde a pessoa entra.
   * As sessões abertas seguem valendo até o token expirar.
   */
  update: async ({ id, ...data }: { id: string; name?: string; email?: string }) => {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  unlinkFromOrganization: async ({ userId, organizationId }: { userId: string; organizationId: string }) => {
    await api.delete(`/users/${userId}/organizations/${organizationId}`);
  },
};
