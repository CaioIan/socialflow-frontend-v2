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

  linkToOrganization: async (data: { userId: string; organizationId: string; role: string }) => {
    const response = await api.post('/users/link', data);
    return response.data;
  }
};
