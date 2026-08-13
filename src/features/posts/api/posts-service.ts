import api from '@/api/axios';

export type PostStatus =
  | 'PENDING'
  | 'ALTERATION_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'FAILED';

/** O que o cron fez com o post. Ausente enquanto o horário agendado não chega. */
export interface PublicationLog {
  outcome: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attempts: number;
  lastError: string | null;
  permalink: string | null;
  publishedAt: string | null;
}

export interface StatusHistoryRecord {
  id: string;
  toStatus: PostStatus;
  fromStatus: PostStatus | null;
  createdAt: string;
  changedByUser: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string | null;
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
    feedUrls: string[];
    storiesUrl: string | null;
    isCarousel: boolean;
    assets?: Array<{ id: string; cloudinaryUrl: string; assetType: string; createdAt: string }>;
  };
  assignedDesigner?: {
    id: string;
    name: string | null;
    email: string;
  };
  statusHistory?: StatusHistoryRecord[];
  publicationLog?: PublicationLog | null;
}

export interface CreatePostRequest {
  campaignId: string;
  scheduledFor: string;
  briefing: string;
  captionFixed: string;
  assignedDesignerId?: string;
}

export interface UploadVersionRequest {
  postId: string;
  feedUrls?: string[];
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
    const response = await api.post('/post-versions/upload', {
      postId: data.postId,
      feedUrls: data.feedUrls,
      storiesUrl: data.storiesUrl,
    });
    return response.data;
  },

  /**
   * Tira o feed ou o stories do post.
   *
   * `POST` porque a operação cria uma versão nova com o que sobrou — nenhum
   * arquivo é apagado, e as versões antigas continuam mostrando a arte que o
   * cliente viu.
   */
  removerPecaDaArte: async ({ postId, piece }: { postId: string; piece: 'FEED' | 'STORIES' }) => {
    const response = await api.post<{ removida: 'FEED' | 'STORIES'; ficouSemArte: boolean }>(
      '/post-versions/remove-piece',
      { postId, piece },
    );
    return response.data;
  },

  uploadAsset: async (file: File, postId: string, assetType: string = 'FEED') => {
    // 2. Solicita os parâmetros de assinatura para o backend
    const signResponse = await api.post('/assets/sign-upload', {
      postId,
      assetType,
      fileName: file.name,
    });
    
    const signData = signResponse.data;

    // 3. Monta o FormData para o Cloudinary (UPLOAD DIRETO)
    const formData = new FormData();
    formData.append('file', file);
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
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
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
    const formData = new FormData();
    formData.append('file', file);

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
  },

  /**
   * Ações em massa. `POST` em vez de `DELETE` com corpo: corpo em DELETE é mal
   * suportado por proxies e clientes HTTP.
   */
  bulkDelete: async (ids: string[]) => {
    const response = await api.post<{ quantidade: number }>('/posts/bulk/delete', { ids });
    return response.data;
  },

  /** Só a hora muda; cada post mantém a própria data. */
  bulkReschedule: async ({ ids, hora, minuto }: { ids: string[]; hora: number; minuto: number }) => {
    const response = await api.patch<{ quantidade: number }>('/posts/bulk/schedule', { ids, hora, minuto });
    return response.data;
  },

  /**
   * Troca as artes de feed da versão atual de uma vez.
   *
   * Substitui a lista inteira: é o que faz um post que subiu com uma imagem só
   * virar carrossel. Fica na mesma versão de propósito — trocar o arquivo não
   * é o mesmo que enviar uma versão nova para o cliente reaprovar.
   */
  replaceFeedUrls: async ({ versionId, feedUrls }: { versionId: string; feedUrls: string[] }) => {
    const response = await api.patch(`/post-versions/${versionId}`, { feedUrls });
    return response.data;
  },

  /**
   * Troca a arte de stories da versão atual.
   *
   * Trocar só o Asset não bastava: a tela lê `currentVersion.storiesUrl` antes
   * do asset, então a imagem antiga continuava aparecendo mesmo com o upload
   * tendo dado certo.
   */
  replaceStoriesUrl: async ({ versionId, storiesUrl }: { versionId: string; storiesUrl: string }) => {
    const response = await api.patch(`/post-versions/${versionId}`, { storiesUrl });
    return response.data;
  },
};
