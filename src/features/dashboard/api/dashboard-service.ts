import api from '@/api/axios';

export interface OverviewStats {
  totalOrganizations: number;
  totalUsers: number;
  totalDesigners: number;
  totalClients: number;
  activeCampaigns: number;
  posts: {
    PENDING: number;
    ALTERATION_REQUESTED: number;
    APPROVED: number;
    CANCELLED: number;
  };
  pendingPostsTotal: number;
}

export interface RecentApproval {
  id: string;
  postId: string;
  campaignTitle: string;
  approvedBy: string;
  approvedAt: string;
  scheduledFor: string;
}

export interface PostsByStatus {
  PENDING: number;
  ALTERATION_REQUESTED: number;
  APPROVED: number;
  CANCELLED: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

class DashboardService {
  async getOverview(organizationId?: string): Promise<OverviewStats> {
    try {
      const params = organizationId ? { organizationId } : {};
      const response = await api.get<OverviewStats>('/stats/overview', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch overview stats:', error);
      throw error;
    }
  }

  async getRecentApprovals(
    organizationId?: string,
    limit: number = 10,
  ): Promise<RecentApproval[]> {
    try {
      const params = organizationId ? { organizationId, limit } : { limit };
      const response = await api.get<RecentApproval[]>('/stats/recent-approvals', {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recent approvals:', error);
      throw error;
    }
  }

  async getPostsByStatus(organizationId?: string): Promise<PostsByStatus> {
    try {
      const params = organizationId ? { organizationId } : {};
      const response = await api.get<PostsByStatus>('/stats/posts-by-status', {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch posts by status:', error);
      throw error;
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      const response = await api.get<Organization[]>('/stats/organizations');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      throw error;
    }
  }
}

export default new DashboardService();
