import api from '@/api/axios';

/** Organização do usuário, com a foto para o avatar composto. */
export interface ProfileOrganization {
  organizationId: string;
  role: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'DESIGNER' | 'CLIENT';
  avatarUrl: string | null;
  createdAt: string;
  organizations: ProfileOrganization[];
}

export const profileService = {
  get: async () => {
    const response = await api.get<Profile>('/profile');
    return response.data;
  },

  /**
   * A imagem chega já recortada, como Blob. O recorte acontece no navegador
   * para o usuário ver exatamente o que vai ficar — e para não subir 8 MB de
   * foto original quando o que se usa é um quadrado pequeno.
   */
  uploadAvatar: async (arquivo: Blob) => {
    const corpo = new FormData();
    corpo.append('file', arquivo, 'avatar.jpg');
    const response = await api.put<Profile>('/profile/avatar', corpo);
    return response.data;
  },

  removeAvatar: async () => {
    const response = await api.delete<Profile>('/profile/avatar');
    return response.data;
  },
};
