export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
