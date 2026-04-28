import api from '@/api/axios';

export interface Campaign {
  id: string;
  organizationId: string;
  title: string;
  referenceYear: number | null;
  referenceMonth: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCampaignRequest {
  title: string;
  referenceYear?: number;
  referenceMonth?: number;
}

export const campaignsService = {
  getAll: async () => {
    const response = await api.get<Campaign[]>('/campaigns');
    return response.data;
  },

  create: async (data: CreateCampaignRequest) => {
    const response = await api.post<Campaign>('/campaigns', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateCampaignRequest>) => {
    const response = await api.patch<Campaign>(`/campaigns/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string) => {
    await api.delete(`/campaigns/${id}`);
  }
};
