export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DESIGNER' | 'CLIENT';
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
}

export interface LoginResponse {
  user: User;
  organizations: Organization[];
}

export interface AuthMeResponse {
  user: User;
}
