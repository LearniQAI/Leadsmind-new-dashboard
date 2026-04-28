export type FormType = 'form' | 'survey';
export type FormStatus = 'draft' | 'published';

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'file' | 'hidden' | 'page_break';
  label: string;
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: string[]; // For dropdown, radio, checkbox
  logic?: {
    action: 'show' | 'hide';
    conditionField: string;
    conditionValue: any;
  };
}

export interface FormSettings {
  successAction: 'message' | 'redirect' | 'funnel';
  successMessage?: string;
  redirectUrl?: string;
  createContact: boolean;
  updateContact: boolean;
  pipelineAction?: {
    pipelineId: string;
    stageId: string;
  };
  workflowTriggerId?: string;
  buttonLabel?: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  fbFormId?: string; // Phase 10 FB Lead Form ID
  emailResponder?: {
    enabled: boolean;
    subject: string;
    body: string;
    bodyHtml?: string;
    bodyJson?: any;
    senderName?: string;
  };
}

export interface Form {
  id: string;
  workspace_id: string;
  name: string;
  type: FormType;
  fields: FormField[];
  settings: FormSettings;
  status: FormStatus;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  workspace_id: string;
  form_id: string;
  contact_id: string | null;
  data: Record<string, any>;
  source_url: string | null;
  ip_address: string | null;
  submitted_at: string;
}
