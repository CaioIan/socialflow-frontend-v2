import api from '@/api/axios';

export type PostStatus = 'PENDING' | 'ALTERATION_REQUESTED' | 'APPROVED' | 'CANCELLED';

export interface StatusHistoryRecord {
  id: string;
  toStatus: PostStatus;
  fromStatus: PostStatus | null;
  createdAt: string;
  changedByUser: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface Post {
  id: string;
  organizationId: string;
  campaignId: string;
  scheduledFor: string;
  briefing: string | null;
  captionFixed: string;
  status: PostStatus;
  assignedDesignerId: string | null;
  currentVersionId: string | null;
  createdAt: string;
  assets?: Array<{ id: string; cloudinaryUrl: string; assetType: string; createdAt: string }>;
  currentVersion?: { 
    id: string;
    versionNumber: number;
    feedUrl: string | null; 
    storiesUrl: string | null;
    assets?: Array<{ id: string; cloudinaryUrl: string; assetType: string; createdAt: string }>;
  };
  assignedDesigner?: {
    id: string;
    name: string | null;
    email: string;
  };
  statusHistory?: StatusHistoryRecord[];
}

export interface CreatePostRequest {
  campaignId: string;
  scheduledFor: string;
  briefing?: string;
  captionFixed: string;
  assignedDesignerId?: string;
}

export interface UploadVersionRequest {
  postId: string;
  feedUrl?: string;
  storiesUrl?: string;
}

export const getLastApproval = (post: Post) => {
  if (!post.statusHistory) return null;
  const approval = post.statusHistory.find(h => h.toStatus === 'APPROVED');
  return approval ? {
    approvedBy: approval.changedByUser.name || approval.changedByUser.email,
    approvedAt: new Date(approval.createdAt)
  } : null;
};

export const postsService = {
  getByCampaign: async (campaignId: string) => {
    // Nota: Atualmente a API pode retornar todos, filtramos por campanha se necessário
    const response = await api.get<Post[]>('/posts', { params: { campaignId } });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Post>(`/posts/${id}`);
    return response.data;
  },

  create: async (data: CreatePostRequest) => {
    const response = await api.post<Post>('/posts', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreatePostRequest>) => {
    const response = await api.patch<Post>(`/posts/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<Post>(`/posts/${id}`);
    return response.data;
  },

  uploadVersion: async (data: UploadVersionRequest) => {
    const response = await api.post('/post-versions/upload', data);
    return response.data;
  },

  uploadAsset: async (file: File, postId: string, assetType: string = 'FEED') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('postId', postId);
    formData.append('assetType', assetType);

    const response = await api.post('/assets/upload', formData);
    return response.data;
  },

  updateStatus: async (postId: string, status: PostStatus, versionId?: string, comment?: string) => {
    const response = await api.patch<Post>(`/posts/${postId}/status`, { 
      status,
      versionId,
      comment
    });
    return response.data;
  },

  replaceAsset: async (assetId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.patch(`/assets/${assetId}`, formData);
    return response.data;
  }
};
