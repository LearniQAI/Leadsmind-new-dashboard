export type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string };

export const CRM_VERSION = '1.0.0';

export type Contact = {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  owner_id: string | null;
  tags: string[];
  lead_score?: number;
  lead_score_explanation?: string;
  no_show_count?: number;
  last_no_show_at?: string;
  no_show_risk_flag?: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContactActivity {
  id: string;
  workspace_id: string;
  contact_id: string;
  type: 'note' | 'task' | 'deal' | 'system' | 'invoice' | 'quote';
  description: string;
  metadata: {
    invoice_id?: string;
    quote_id?: string;
    amount?: number;
    status?: string;
    [key: string]: any;
  };
  created_by: string | null;
  created_at: string;
}

export interface ContactNote {
  id: string;
  workspace_id: string;
  contact_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactTask {
  id: string;
  workspace_id: string;
  contact_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'todo' | 'completed';
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Opportunity {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  stage_id: string;
  title: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  owner_id: string | null;
  tags: string[];
  stage_entered_at: string;
  position: number;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    total_invoiced?: number;
    outstanding_balance?: number;
  };
}

export interface Invoice {
  id: string;
  workspace_id: string;
  contact_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'open' | 'paid' | 'void' | 'uncollectible';
  subtotal: number;
  tax_total: number;
  discount_total: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  due_date: string | null;
  notes: string | null;
  terms: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface Quote {
  id: string;
  workspace_id: string;
  contact_id: string;
  quote_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  subtotal: number;
  tax_total: number;
  discount_total: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  expiry_date: string | null;
  notes: string | null;
  terms: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  workspace_id: string;
  invoice_id?: string;
  quote_id?: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  position: number;
}

export interface InvoiceSettings {
  id: string;
  workspace_id: string;
  invoice_prefix: string;
  next_invoice_number: number;
  quote_prefix: string;
  next_quote_number: number;
  default_terms: string | null;
  default_notes: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  logo_url: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASES 11 - 20 TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ReviewRequest {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  channel: 'email' | 'sms';
  status: 'sent' | 'opened' | 'clicked' | 'reviewed';
  sent_at: string;
  review_received: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  workspace_id: string;
  platform: 'google' | 'facebook';
  external_review_id: string;
  reviewer_name: string | null;
  rating: number;
  body: string | null;
  replied: boolean;
  reply_text: string | null;
  replied_at: string | null;
  review_date: string | null;
}

export interface SocialAccount {
  id: string;
  workspace_id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'google_business' | 'youtube' | 'pinterest' | 'tiktok';
  account_name: string | null;
  account_id: string | null;
  connected_at: string;
}

export interface SocialPost {
  id: string;
  workspace_id: string;
  platforms: string[];
  content: string;
  media_urls: string[];
  scheduled_for: string | null;
  published_at: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  error_message: string | null;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  contact_id: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  due_date: string | null;
}

export interface Proposal {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  title: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';
  total_value: number;
  signed_at: string | null;
}
