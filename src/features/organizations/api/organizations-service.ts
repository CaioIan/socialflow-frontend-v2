import api from '@/api/axios';
import type { Organization, CreateOrganizationRequest, UpdateOrganizationRequest } from '../types';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const organizationsService = {
  getAll: async () => {
    const response = await api.get<Organization[]>('/organizations');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Organization>(`/organizations/${id}`);
    return response.data;
  },

  create: async (data: CreateOrganizationRequest) => {
    const payload = { ...data, slug: slugify(data.name) };
    const response = await api.post<Organization>('/organizations', payload);
    return response.data;
  },

  update: async (id: string, data: UpdateOrganizationRequest) => {
    const payload = { ...data, slug: slugify(data.name) };
    const response = await api.patch<Organization>(`/organizations/${id}`, payload);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/organizations/${id}`);
  },

  reactivate: async (id: string) => {
    const response = await api.patch<Organization>(`/organizations/${id}/reactivate`);
    return response.data;
  },

  getIntegrationConfig: async (id: string) => {
    const response = await api.get<{ n8nWebhookUrl: string; isActive: boolean }>(`/organizations/${id}/integration`);
    return response.data;
  },

  upsertIntegrationConfig: async (id: string, data: { n8nWebhookUrl: string; isActive?: boolean }) => {
    const response = await api.post(`/organizations/${id}/integration`, data);
    return response.data;
  }
};
