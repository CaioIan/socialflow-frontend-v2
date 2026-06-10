import api from '@/api/axios';
import { compressImageIfNeeded } from '@/lib/image-compression';

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

export interface ImportPostsResult {
  totalRows: number;
  created: number;
  errors: Array<{ row: number; message: string }>;
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
    // 1. Opcional: Comprime para economizar banda do usuário
    const processedFile = await compressImageIfNeeded(file);

    // 2. Solicita os parâmetros de assinatura para o backend
    const signResponse = await api.post('/assets/sign-upload', {
      postId,
      assetType,
      fileName: processedFile.name,
    });
    
    const signData = signResponse.data;

    // 3. Monta o FormData para o Cloudinary (UPLOAD DIRETO)
    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp.toString());
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    formData.append('public_id', signData.publicId);

    // 4. Faz o upload diretamente para o Cloudinary
    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!cloudinaryRes.ok) {
      throw new Error('Falha no upload direto para o Cloudinary');
    }

    const cloudinaryData = await cloudinaryRes.json();

    // 5. Registra o asset no banco de dados via API
    const registerResponse = await api.post('/assets/register', {
      postId,
      assetType,
      originalFileName: file.name,
      fileSize: processedFile.size,
      mimeType: processedFile.type || 'application/octet-stream',
      cloudinaryPublicId: cloudinaryData.public_id,
      cloudinaryUrl: cloudinaryData.secure_url,
    });

    return registerResponse.data;
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
    // Comprime a imagem automaticamente se exceder o limite da Vercel (4.5MB)
    const processedFile = await compressImageIfNeeded(file);

    const formData = new FormData();
    formData.append('file', processedFile);

    const response = await api.patch(`/assets/${assetId}`, formData);
    return response.data;
  },

  downloadImportTemplate: async () => {
    const response = await api.get('/posts/import-template', { responseType: 'blob' });
    return response.data as Blob;
  },

  importPosts: async (campaignId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaignId', campaignId);

    const response = await api.post<ImportPostsResult>('/posts/import', formData);
    return response.data;
  }
};
