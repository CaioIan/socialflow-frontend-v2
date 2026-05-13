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
  slug: string;
  n8nWebhookUrl?: string;
  webhookToken?: string;
  webhookHeaderName?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  slug: string;
  n8nWebhookUrl?: string;
  webhookToken?: string;
  webhookHeaderName?: string;
}
