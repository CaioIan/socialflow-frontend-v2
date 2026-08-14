import api from '@/api/axios';

export type MuralItemType = 'IMAGE' | 'CARD';

export interface MuralBadge {
  label: string;
  backgroundColor: string;
  textColor: string;
}

export interface MuralAudienceUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'DESIGNER' | 'CLIENT';
}

export interface MuralItem {
  id: string;
  type: MuralItemType;
  /** `null` = aviso sem recorte por organização. */
  organizationId: string | null;
  /** Nome da empresa, para o crachá na tela de gestão. `null` quando global. */
  organizationName: string | null;
  /** Foto da empresa exibida no crachá. `null` quando global ou sem foto. */
  organizationLogoUrl: string | null;
  /** Zero = todo o público do filtro; maior que zero = pessoas específicas. */
  audienceCount?: number;
  imageUrl: string | null;
  markdown: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  /** Quando ligado, o modal é acessado por um botão explícito no card. */
  showMoreEnabled: boolean;
  showMoreBackgroundColor: string;
  showMoreTextColor: string;
  showMoreIconColor: string;
  linkButtonEnabled: boolean;
  linkButtonLabel: string | null;
  linkButtonUrl: string | null;
  linkButtonBackgroundColor: string;
  linkButtonTextColor: string;
  /** Exibe a ação fixa de instalação do PWA com o gradiente da marca. */
  installButtonEnabled: boolean;
  /** Restringe o aviso aos designers da organização. */
  designersOnly: boolean;
  badges: MuralBadge[];
  createdAt: string;
}

export const muralService = {
  /**
   * O que a pessoa pode ver.
   *
   * O recorte é do servidor: ele devolve os globais mais os de todas as
   * organizações às quais a pessoa pertence. O front não filtra nada — não
   * teria como garantir autorização.
   */
  listar: async () => {
    const response = await api.get<MuralItem[]>('/mural');
    return response.data;
  },

  listarDestinatarios: async (organizationId: string) => {
    const response = await api.get<MuralAudienceUser[]>(
      `/mural/audience/${organizationId}`,
    );
    return response.data;
  },

  listarDesigners: async () => {
    const response = await api.get<MuralAudienceUser[]>('/mural/designers');
    return response.data;
  },

  buscarAudienciaDoItem: async (id: string) => {
    const response = await api.get<{ userIds: string[] }>(`/mural/${id}/audience`);
    return response.data;
  },

  criarCard: async (data: {
    markdown: string;
    backgroundColor: string;
    textColor: string;
    badges: MuralBadge[];
    organizationId: string | null;
    audienceUserIds: string[];
    showMoreEnabled: boolean;
    showMoreBackgroundColor: string;
    showMoreTextColor: string;
    showMoreIconColor: string;
    linkButtonEnabled?: boolean;
    linkButtonLabel?: string;
    linkButtonUrl?: string;
    linkButtonBackgroundColor?: string;
    linkButtonTextColor?: string;
    installButtonEnabled: boolean;
    designersOnly: boolean;
  }) => {
    const response = await api.post<MuralItem>('/mural/cards', data);
    return response.data;
  },

  atualizarCard: async (
    id: string,
    data: {
      markdown: string;
      backgroundColor: string;
      textColor: string;
      badges: MuralBadge[];
      organizationId: string | null;
      audienceUserIds: string[];
      showMoreEnabled: boolean;
      showMoreBackgroundColor: string;
      showMoreTextColor: string;
      showMoreIconColor: string;
      linkButtonEnabled?: boolean;
      linkButtonLabel?: string;
      linkButtonUrl?: string;
      linkButtonBackgroundColor?: string;
      linkButtonTextColor?: string;
      installButtonEnabled: boolean;
      designersOnly: boolean;
    },
  ) => {
    const response = await api.patch<MuralItem>(`/mural/cards/${id}`, data);
    return response.data;
  },

  /** A imagem chega já recortada em 16:9, como Blob. */
  criarImagem: async (
    arquivo: Blob,
    organizationId: string | null,
    audienceUserIds: string[],
    designersOnly: boolean,
  ) => {
    const corpo = new FormData();
    corpo.append('file', arquivo, 'mural.jpg');
    // String vazia em vez de omitir: o backend lê `organizationId || null`, e
    // FormData não transmite `null`.
    corpo.append('organizationId', organizationId ?? '');
    corpo.append('audienceUserIds', JSON.stringify(audienceUserIds));
    corpo.append('designersOnly', String(designersOnly));

    const response = await api.post<MuralItem>('/mural/images', corpo);
    return response.data;
  },

  atualizarImagem: async (
    id: string,
    arquivo: Blob | null,
    organizationId: string | null,
    audienceUserIds: string[],
    designersOnly: boolean,
  ) => {
    const corpo = new FormData();
    if (arquivo) corpo.append('file', arquivo, 'mural.jpg');
    corpo.append('organizationId', organizationId ?? '');
    corpo.append('audienceUserIds', JSON.stringify(audienceUserIds));
    corpo.append('designersOnly', String(designersOnly));

    const response = await api.patch<MuralItem>(`/mural/images/${id}`, corpo);
    return response.data;
  },

  remover: async (id: string) => {
    await api.delete(`/mural/${id}`);
  },
};
