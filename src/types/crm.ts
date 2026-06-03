/**
 * CRM & Pipelines Data Bedrock
 * This file defines the core relational interfaces for the LeadsMind sales engine.
 */

export type ActivityType = 'note' | 'task' | 'deal' | 'system' | 'invoice' | 'quote' | 'edit';

export interface Contact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: string;
  owner_id?: string;
  tags: string[];
  lead_score?: number;
  last_activity_at?: string;
  id_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactActivity {
  id: string;
  workspace_id: string;
  contact_id: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, any>;
  created_by?: string;
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
  tags: string[];
  created_at: string;
  updated_at: string;
  
  // Joins
  contact?: Contact;
  stage?: PipelineStage;
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
