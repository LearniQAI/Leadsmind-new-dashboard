/**
 * CraftJS Content Tree Types
 * These interfaces represent the structure of the JSON content stored in the 'pages' table.
 */

export interface CraftNode {
  type: {
    resolvedName: string;
  };
  isCanvas: boolean;
  props: Record<string, any>;
  displayName: string;
  custom: Record<string, any>;
  hidden: boolean;
  nodes: string[];
  linkedNodes: Record<string, string>;
}

export interface CraftContent {
  [key: string]: CraftNode;
}

export type PageContext = 'website' | 'funnel';

export interface Website {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  subdomain?: string;
  custom_domain?: string;
  favicon_url?: string;
  is_published: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Funnel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  subdomain?: string;
  custom_domain?: string;
  is_published: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WebsitePage {
  id: string;
  website_id: string;
  name: string;
  path_name: string;
  created_at: string;
  updated_at: string;
}

export interface FunnelStep {
  id: string;
  funnel_id: string;
  name: string;
  path_name: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  workspace_id: string;
  website_page_id?: string;
  funnel_step_id?: string;
  name: string;
  content: CraftContent | null;
  preview_image?: string;
  is_published: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageVariant {
  id: string;
  page_id: string;
  name: string;
  content: CraftContent;
  is_main: boolean;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface PageSubmission {
  id: string;
  workspace_id: string;
  page_id: string;
  contact_id?: string;
  form_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}
