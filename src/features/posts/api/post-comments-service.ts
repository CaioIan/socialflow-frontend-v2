import api from '@/api/axios';

export interface PostComment {
  id: string;
  organizationId: string;
  postId: string;
  postVersionId: string;
  authorUserId: string;
  target: 'FEED' | 'STORIES' | 'GENERAL';
  body: string;
  createdAt: string;
  authorUser?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  postVersion?: {
    id: string;
    versionNumber: number;
  };
}

export interface CreatePostCommentRequest {
  postId: string;
  postVersionId: string;
  target?: 'FEED' | 'STORIES' | 'GENERAL';
  body: string;
}

export const postCommentsService = {
  getByPost: async (postId: string) => {
    const response = await api.get<{ data: PostComment[] }>('/post-comments', { params: { postId } });
    return response.data.data;
  },

  create: async (data: CreatePostCommentRequest) => {
    const response = await api.post<PostComment>('/post-comments', data);
    return response.data;
  },

  update: async (id: string, data: { body: string; target?: 'FEED' | 'STORIES' | 'GENERAL' }) => {
    const response = await api.patch<PostComment>(`/post-comments/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/post-comments/${id}`);
    return response.data;
  }
};
