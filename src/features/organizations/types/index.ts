export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users?: {
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      isActive: boolean;
      role: string;
      organizations?: {
        role: string;
        organization: {
          id: string;
          name: string;
        };
      }[];
    };
  }[];
}

export interface CreateOrganizationRequest {
  name: string;
}

export interface UpdateOrganizationRequest {
  name: string;
}
