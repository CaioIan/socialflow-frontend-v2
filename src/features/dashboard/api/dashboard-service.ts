import api from '@/api/axios';

export type PostStatus = 'PENDING' | 'ALTERATION_REQUESTED' | 'APPROVED' | 'PUBLISHED' | 'CANCELLED';

export interface OverviewStats {
  totalOrganizations: number;
  totalUsers: number;
  totalDesigners: number;
  totalClients: number;
  activeCampaigns: number;
  posts: Record<PostStatus, number>;
  pendingPostsTotal: number;
}

export interface StatsPostListItem {
  id: string;
  organizationId: string;
  organizationName: string;
  campaignId: string;
  campaignTitle: string;
  captionFixed: string;
  scheduledFor: string;
  status: PostStatus;
  createdAt: string;
}

export interface StatsPostsList {
  items: StatsPostListItem[];
  total: number;
}

export interface StatsTimelinePoint {
  date: string;
  created: number;
  approved: number;
}

export type PeriodDays = 7 | 30 | 90;

class DashboardService {
  async getOverview(organizationId?: string): Promise<OverviewStats> {
    const params = organizationId ? { organizationId } : {};
    const response = await api.get<OverviewStats>('/stats/overview', { params });
    return response.data;
  }

  async getPostsByStatus(
    status: PostStatus,
    organizationId?: string,
    skip = 0,
    take = 20,
  ): Promise<StatsPostsList> {
    const params = { status, skip, take, ...(organizationId ? { organizationId } : {}) };
    const response = await api.get<StatsPostsList>('/stats/posts', { params });
    return response.data;
  }

  async getPostsTimeline(days: PeriodDays, organizationId?: string): Promise<StatsTimelinePoint[]> {
    const params = { days, ...(organizationId ? { organizationId } : {}) };
    const response = await api.get<StatsTimelinePoint[]>('/stats/posts-timeline', { params });
    return response.data;
  }
}

export default new DashboardService();
