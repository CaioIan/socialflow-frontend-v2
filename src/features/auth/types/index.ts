export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DESIGNER' | 'CLIENT';
  /** `null` quando não há foto — a interface cai na inicial do nome. */
  avatarUrl?: string | null;
  isActive: boolean;
  organizationId?: string; // Presente após selecionar org ou se já houver uma
}

export interface Organization {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
  /** Foto da empresa, usada no avatar composto e no seletor do menu. */
  logoUrl?: string | null;
}

export interface LoginResponse {
  user: User;
  organizations: Organization[];
}

export interface AuthMeResponse {
  user: User;
}
