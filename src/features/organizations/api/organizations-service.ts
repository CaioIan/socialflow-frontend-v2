import api from '@/api/axios';
import type { Organization, CreateOrganizationRequest, UpdateOrganizationRequest } from '../types';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const organizationsService = {
  /**
   * `incluirInativas` só faz sentido na tela de administração: é lá que uma
   * organização desativada precisa aparecer para poder ser reativada. O filtro
   * do dashboard e o modal de vínculo continuam recebendo só as ativas.
   */
  getAll: async (incluirInativas = false) => {
    const response = await api.get<Organization[]>('/organizations', {
      params: incluirInativas ? { includeInactive: 'true' } : undefined,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Organization>(`/organizations/${id}`);
    return response.data;
  },

  create: async (data: CreateOrganizationRequest) => {
    const payload = { ...data, slug: slugify(data.name) };
    const response = await api.post<Organization>('/organizations', payload);
    return response.data;
  },

  update: async (id: string, data: UpdateOrganizationRequest) => {
    const payload = { ...data, slug: slugify(data.name) };
    const response = await api.patch<Organization>(`/organizations/${id}`, payload);
    return response.data;
  },

  /**
   * Desativa sem apagar. Nada é perdido: campanhas, posts e histórico
   * continuam no banco e `reactivate` desfaz.
   *
   * Usuários que só trabalhavam nesta organização são desativados junto; quem
   * atende outras empresas segue ativo e apenas deixa de ver esta.
   */
  deactivate: async (id: string) => {
    await api.patch(`/organizations/${id}/deactivate`);
  },

  reactivate: async (id: string) => {
    await api.patch(`/organizations/${id}/reactivate`);
  },

  /**
   * Foto de perfil da organização. Vai como multipart — o axios do projeto não
   * força `Content-Type`, justamente para o FormData definir o boundary dele.
   */
  uploadLogo: async ({ id, file }: { id: string; file: File }) => {
    const corpo = new FormData();
    corpo.append('file', file);
    const response = await api.put<Organization>(`/organizations/${id}/logo`, corpo);
    return response.data;
  },

  /** Volta para a inicial do nome. */
  removeLogo: async (id: string) => {
    const response = await api.delete<Organization>(`/organizations/${id}/logo`);
    return response.data;
  },
};
