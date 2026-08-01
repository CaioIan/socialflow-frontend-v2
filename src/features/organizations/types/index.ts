/** Situação do Instagram da organização. Nunca traz nada da credencial. */
export interface OrganizationInstagramSummary {
  status: 'CONNECTED' | 'REVOKED';
  username: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** `null` quando a organização nunca conectou uma conta. */
  instagram: OrganizationInstagramSummary | null;
}

export interface CreateOrganizationRequest {
  name: string;
  /** Derivado do `name` pelo organizations-service; não enviar manualmente. */
  slug?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  /** Derivado do `name` pelo organizations-service; não enviar manualmente. */
  slug?: string;
}
