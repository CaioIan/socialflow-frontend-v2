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
  getAll: async (role?: string, isActive?: boolean) => {
    const response = await api.get<UserWithOrgs[]>('/users', { 
      params: { role, isActive } 
    });
    return response.data;
  },

  create: async (data: { email: string; passwordHash: string; name: string; role: string; organizationId?: string }) => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  linkToOrganization: async (data: { userId: string; organizationId: string; role: string }) => {
    const response = await api.post('/users/link', data);
    return response.data;
  },
  
  unlinkFromOrganization: async (data: { userId: string; organizationId: string }) => {
    const response = await api.delete('/users/unlink', { data });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  reactivate: async (id: string) => {
    const response = await api.post(`/users/${id}/reactivate`);
    return response.data;
  }
};
