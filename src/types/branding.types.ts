export interface WorkspaceBranding {
  id: string;
  workspace_id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  custom_domain: string | null;
  platform_name: string | null;
  support_email: string | null;
  updated_at: string | null;
}

export type DomainVerificationStatus = 'pending' | 'verified' | 'error' | 'unchecked';

export interface DomainVerificationResult {
  status: DomainVerificationStatus;
  message: string;
}
