export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  n8nWebhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  n8nWebhookUrl?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  slug: string;
  n8nWebhookUrl?: string;
}
