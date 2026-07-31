import api from '@/api/axios';

export type InstagramAccountStatus = 'CONNECTED' | 'REVOKED';

/**
 * Conta conectada de uma organização.
 *
 * O token nunca chega ao frontend, nem mascarado: `hasToken` apenas confirma
 * que existe credencial gravada.
 */
export interface InstagramAccount {
  id: string;
  organizationId: string;
  igUserId: string;
  username: string | null;
  hasToken: boolean;
  tokenExpiresAt: string | null;
  status: InstagramAccountStatus;
  lastVerifiedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectInstagramRequest {
  igUserId: string;
  accessToken: string;
}

export const instagramService = {
  /** Devolve `null` quando a organização ainda não conectou — não é erro. */
  get: async (): Promise<InstagramAccount | null> => {
    const response = await api.get<InstagramAccount | ''>('/instagram');
    return response.data || null;
  },

  connect: async (data: ConnectInstagramRequest) => {
    const response = await api.put<InstagramAccount>('/instagram', data);
    return response.data;
  },

  /** Reconfere a credencial na Meta. Responde 200 mesmo quando ela é recusada. */
  verify: async () => {
    const response = await api.post<InstagramAccount>('/instagram/verify');
    return response.data;
  },

  disconnect: async () => {
    await api.delete('/instagram');
  },
};
