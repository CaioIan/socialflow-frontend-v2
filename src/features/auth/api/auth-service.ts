import api from '@/api/axios';
import type { LoginResponse } from '../types';
import type { LoginFormData } from '../schemas/login-schema';

export const authService = {
  login: async (data: LoginFormData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // O backend limpa os cookies httpOnly via Set-Cookie
    await api.post('/auth/logout');
  },

  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  selectOrganization: async (organizationId: string): Promise<{ user: any }> => {
    const response = await api.post('/auth/select-organization', { organizationId });
    return response.data;
  }
};
