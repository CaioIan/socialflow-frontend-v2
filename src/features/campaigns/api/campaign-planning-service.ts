import api from '@/api/axios';

export type PlanningStatus = 'DRAFT' | 'AWAITING_APPROVAL' | 'REVISION_REQUESTED' | 'APPROVED' | 'POSTS_CREATED';

export interface CampaignPlanning {
  id: string;
  campaignId: string;
  content: string;
  status: PlanningStatus;
  revisionComment: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const base = (campaignId: string) => `/campaigns/${campaignId}/planning`;

export const campaignPlanningService = {
  get: async (campaignId: string): Promise<CampaignPlanning | null> => {
    try {
      const response = await api.get<CampaignPlanning>(base(campaignId));
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  create: async (campaignId: string, content: string): Promise<CampaignPlanning> => {
    const response = await api.post<CampaignPlanning>(base(campaignId), { content });
    return response.data;
  },

  update: async (campaignId: string, content: string): Promise<CampaignPlanning> => {
    const response = await api.patch<CampaignPlanning>(base(campaignId), { content });
    return response.data;
  },

  delete: async (campaignId: string): Promise<void> => {
    await api.delete(base(campaignId));
  },

  submit: async (campaignId: string): Promise<CampaignPlanning> => {
    const response = await api.post<CampaignPlanning>(`${base(campaignId)}/submit`);
    return response.data;
  },

  approve: async (campaignId: string): Promise<CampaignPlanning> => {
    const response = await api.post<CampaignPlanning>(`${base(campaignId)}/approve`);
    return response.data;
  },

  requestRevision: async (campaignId: string, comment?: string): Promise<CampaignPlanning> => {
    const response = await api.post<CampaignPlanning>(`${base(campaignId)}/request-revision`, { comment });
    return response.data;
  },
};
