export type TriggerType = 
  | 'contact_created' 
  | 'tag_added' 
  | 'stage_changed' 
  | 'form_submitted' 
  | 'date_field';

export type ActionType = 
  | 'send_email' 
  | 'send_sms' 
  | 'add_tag' 
  | 'remove_tag' 
  | 'assign_owner' 
  | 'move_pipeline_stage' 
  | 'wait' 
  | 'if_else' 
  | 'notify_team';

export interface Workflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  workspace_id: string;
  position: number;
  type: ActionType;
  config: any;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workspace_id: string;
  workflow_id: string;
  contact_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step_id: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  context: any;
  updated_at: string;
}

export interface WorkflowStepLog {
  id: string;
  execution_id: string;
  workspace_id: string;
  step_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}
