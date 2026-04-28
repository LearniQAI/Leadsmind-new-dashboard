export type EmailTemplateType = 'broadcast' | 'sequence' | 'transactional';

export interface EmailTemplate {
  id: string;
  workspace_id: string;
  name: string;
  subject: string;
  body_html: string | null;
  body_json: any | null;
  type: EmailTemplateType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export interface EmailCampaign {
  id: string;
  workspace_id: string;
  name: string;
  template_id: string | null;
  subject: string;
  from_name: string | null;
  from_email: string | null;
  body_html?: string | null;
  body_json?: any | null;
  segment: CampaignSegment | null;
  status: CampaignStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  created_by: string | null;
  created_at: string;
}

export interface CampaignSegment {
  type: 'all' | 'filtered';
  filters?: {
    tags?: string[];
    source?: string[];
    assigned_to?: string[];
    custom_fields?: Record<string, any>;
    logic?: 'AND' | 'OR';
  };
}

export interface CampaignStats {
  campaign_id: string;
  workspace_id: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  spam_reported: number;
}

export interface EmailEvent {
  id: string;
  workspace_id: string;
  campaign_id: string;
  contact_id: string | null;
  event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'spam';
  link_url: string | null;
  occurred_at: string;
}

export interface Unsubscribe {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  email: string;
  unsubscribed_at: string;
}
