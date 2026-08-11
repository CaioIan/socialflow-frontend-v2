import api from '@/api/axios';

export type MuralItemType = 'IMAGE' | 'CARD';

export interface MuralItem {
  id: string;
  type: MuralItemType;
  /** `null` = aviso global, visível para todas as organizações. */
  organizationId: string | null;
  /** Nome da empresa, para o crachá na tela de gestão. `null` quando global. */
  organizationName: string | null;
  imageUrl: string | null;
  markdown: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  createdAt: string;
}

export const muralService = {
  /**
   * O que a pessoa pode ver.
   *
   * O recorte é do servidor: ele devolve os globais mais os da organização em
   * uso. O front não filtra nada — não teria como garantir.
   */
  listar: async () => {
    const response = await api.get<MuralItem[]>('/mural');
    return response.data;
  },

  criarCard: async (data: {
    markdown: string;
    backgroundColor: string;
    textColor: string;
    organizationId: string | null;
  }) => {
    const response = await api.post<MuralItem>('/mural/cards', data);
    return response.data;
  },

  /** A imagem chega já recortada em 16:9, como Blob. */
  criarImagem: async (arquivo: Blob, organizationId: string | null) => {
    const corpo = new FormData();
    corpo.append('file', arquivo, 'mural.jpg');
    // String vazia em vez de omitir: o backend lê `organizationId || null`, e
    // FormData não transmite `null`.
    corpo.append('organizationId', organizationId ?? '');

    const response = await api.post<MuralItem>('/mural/images', corpo);
    return response.data;
  },

  remover: async (id: string) => {
    await api.delete(`/mural/${id}`);
  },
};
