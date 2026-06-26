import api from '@/api/axios';

export interface ClientAiConfig {
  id: string;
  organizationId: string;
  roteiroPrompt: string | null;
  designPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const aiConfigService = {
  get: async (organizationId: string): Promise<ClientAiConfig | null> => {
    try {
      const response = await api.get<ClientAiConfig>(`/organizations/${organizationId}/ai-config`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  upsert: async (organizationId: string, data: { roteiroPrompt?: string; designPrompt?: string }): Promise<ClientAiConfig> => {
    const response = await api.put<ClientAiConfig>(`/organizations/${organizationId}/ai-config`, data);
    return response.data;
  },
};
