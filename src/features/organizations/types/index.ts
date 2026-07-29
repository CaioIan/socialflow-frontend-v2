export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  n8nWebhookUrl?: string;
  webhookToken?: string;
  webhookHeaderName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  /** Derivado do `name` pelo organizations-service; não enviar manualmente. */
  slug?: string;
  n8nWebhookUrl?: string;
  webhookToken?: string;
  webhookHeaderName?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  /** Derivado do `name` pelo organizations-service; não enviar manualmente. */
  slug?: string;
  n8nWebhookUrl?: string;
  webhookToken?: string;
  webhookHeaderName?: string;
}
