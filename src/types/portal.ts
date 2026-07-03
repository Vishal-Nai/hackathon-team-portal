export interface PortalConfig {
  portalId: string;
  title: string;
  tagline: string;
  createdAt: string;
  adminToken?: string;
  organizerUid?: string;
  canEdit?: boolean;
}

export interface PortalConfigInput {
  title: string;
  tagline: string;
}
