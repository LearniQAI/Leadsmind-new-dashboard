export interface Contact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: string;
  owner_id?: string;
  tags?: string[];
  lead_score?: number;
  lead_score_explanation?: string;
  no_show_count?: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactActivity {
  id: string;
  workspace_id: string;
  contact_id: string;
  type: 'note' | 'task' | 'deal' | 'system' | 'invoice' | 'quote';
  description: string;
  metadata?: any;
  created_by?: string;
  created_at: string;
}

export interface ContactNote {
  id: string;
  workspace_id: string;
  contact_id: string;
  content: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactTask {
  id: string;
  workspace_id: string;
  contact_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'todo' | 'completed';
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  contact_id?: string;
  invoice_number: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  due_date?: string;
  created_at: string;
}

export interface Quote {
  id: string;
  workspace_id: string;
  contact_id?: string;
  quote_number: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  expiry_date?: string;
  created_at: string;
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
  contact_id?: string;
  stage_id: string;
  title: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  owner_id?: string;
  stage_entered_at: string;
  position: number;
  tags?: string[]; // Assuming tags can be attached to opportunities too
  created_at: string;
  updated_at: string;
  contact?: Contact & {
    total_invoiced?: number;
    outstanding_balance?: number;
  };
}
