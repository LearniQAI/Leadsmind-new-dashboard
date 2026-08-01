// Drives the workflow-editor's per-step config form. One entry per action
// type actually handled by executor.ts (src/lib/automation/actions_registry.ts's
// AutomationActions map, plus the wait/route/split step types executor.ts
// handles directly). if_else is intentionally excluded — confirmed dead,
// executor.ts never handles that step type.
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select'
  | 'tag' | 'pipelineStage' | 'member' | 'course' | 'bundle';

export interface ActionField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[]; // for 'select'
  required?: boolean;
  placeholder?: string;
  hint?: string;
}

export interface ActionDef {
  value: string;
  label: string;
  fields: ActionField[];
}

export const STEP_TYPES: ActionDef[] = [
  { value: 'wait', label: 'Wait', fields: [
    { key: 'delayValue', label: 'Delay amount', type: 'number', required: true },
    { key: 'delayUnit', label: 'Delay unit', type: 'select', options: [
      { value: 'minutes', label: 'Minutes' }, { value: 'hours', label: 'Hours' }, { value: 'days', label: 'Days' },
    ], required: true },
  ]},
  { value: 'route', label: 'Route (branching)', fields: [] }, // config built by BranchListEditor
  { value: 'split', label: 'A/B split', fields: [] }, // config built by BranchListEditor
  { value: 'send_email', label: 'Send email', fields: [
    { key: 'subject', label: 'Subject', type: 'text', required: true },
    { key: 'body', label: 'Body (HTML or plain text)', type: 'textarea', required: true },
    { key: 'isHtml', label: 'Body is HTML', type: 'boolean' },
  ]},
  { value: 'send_sms', label: 'Send SMS', fields: [
    { key: 'message', label: 'Message', type: 'textarea', required: true },
  ]},
  { value: 'apply_tag', label: 'Apply tag', fields: [
    { key: 'tag', label: 'Tag', type: 'tag', required: true },
  ]},
  { value: 'add_tag', label: 'Add tag', fields: [
    { key: 'tag', label: 'Tag', type: 'tag', required: true },
  ]},
  { value: 'lead_score', label: 'Recalculate lead score', fields: [] },
  { value: 'update_lead_score', label: 'Adjust lead score', fields: [
    { key: 'points', label: 'Points to add', type: 'number', required: true },
  ]},
  { value: 'set_grade_tag', label: 'Set lead grade', fields: [
    { key: 'grade', label: 'Grade', type: 'text', required: true, placeholder: 'e.g. A, B, C' },
  ]},
  { value: 'social_post', label: 'Create social post', fields: [
    { key: 'content', label: 'Post content', type: 'textarea', required: true },
    { key: 'platforms', label: 'Platforms (comma-separated)', type: 'text', required: true, placeholder: 'facebook, linkedin' },
  ]},
  { value: 'lms_enroll', label: 'Enroll in course', fields: [
    { key: 'courseId', label: 'Course', type: 'course', required: true },
    { key: 'access_type', label: 'Access type', type: 'select', options: [
      { value: 'full', label: 'Full' }, { value: 'trial', label: 'Trial' }, { value: 'preview', label: 'Preview' },
    ]},
    { key: 'duration_days', label: 'Access duration (days, blank = unlimited)', type: 'number' },
    { key: 'welcome_email_enabled', label: 'Send welcome email', type: 'boolean' },
    { key: 'welcome_whatsapp_enabled', label: 'Send welcome WhatsApp', type: 'boolean' },
    { key: 'email_subject', label: 'Welcome email subject', type: 'text' },
    { key: 'email_body', label: 'Welcome email body (HTML)', type: 'textarea' },
    { key: 'whatsapp_body', label: 'Welcome WhatsApp message', type: 'text' },
  ]},
  { value: 'lms_enroll_bundle', label: 'Enroll in bundle', fields: [
    { key: 'bundleId', label: 'Bundle', type: 'bundle', required: true },
    { key: 'duration_days', label: 'Access duration (days, blank = unlimited)', type: 'number' },
    { key: 'welcome_email_enabled', label: 'Send welcome email', type: 'boolean' },
    { key: 'welcome_whatsapp_enabled', label: 'Send welcome WhatsApp', type: 'boolean' },
    { key: 'email_subject', label: 'Welcome email subject', type: 'text' },
    { key: 'email_body', label: 'Welcome email body (HTML)', type: 'textarea' },
    { key: 'child_privileges', label: 'Per-course access overrides (advanced JSON, optional)', type: 'textarea',
      hint: 'JSON map of courseId -> access_type, e.g. {"<courseId>":"trial"}. Leave blank for full access to all bundle courses.' },
  ]},
  { value: 'lms_revoke_access', label: 'Revoke LMS access', fields: [
    { key: 'courseId', label: 'Course (optional)', type: 'course' },
    { key: 'bundleId', label: 'Bundle (optional)', type: 'bundle' },
    { key: 'grace_period_hours', label: 'Grace period (hours, blank = immediate)', type: 'number' },
    { key: 'send_alarm', label: 'Send expiry warning message', type: 'boolean' },
    { key: 'alarm_message', label: 'Warning message', type: 'text' },
  ]},
  { value: 'update_community_privilege', label: 'Update community privilege', fields: [
    { key: 'level', label: 'Level', type: 'select', required: true, options: [
      { value: 'member', label: 'Member' }, { value: 'moderator', label: 'Moderator' }, { value: 'admin', label: 'Admin' },
    ]},
  ]},
  { value: 'send_whatsapp_template', label: 'Send WhatsApp template', fields: [
    { key: 'templateName', label: 'Template name', type: 'text', required: true },
    { key: 'languageCode', label: 'Language code', type: 'text', placeholder: 'en' },
    { key: 'components', label: 'Template components (advanced JSON, optional)', type: 'textarea' },
  ]},
  { value: 'lms_update_progress', label: 'Update lesson progress', fields: [
    { key: 'lessonId', label: 'Lesson ID', type: 'text', required: true, hint: 'Paste the lesson UUID.' },
    { key: 'completed', label: 'Mark as completed', type: 'boolean' },
  ]},
  { value: 'update_field', label: 'Update contact field', fields: [
    { key: 'field', label: 'Contact field name', type: 'text', required: true, placeholder: 'e.g. source, lead_grade' },
    { key: 'value', label: 'New value', type: 'text', required: true },
  ]},
  { value: 'move_to_stage', label: 'Move deal to pipeline stage', fields: [
    { key: 'stageId', label: 'Pipeline stage', type: 'pipelineStage', required: true },
  ]},
  { value: 'notify_team', label: 'Notify team', fields: [
    { key: 'message', label: 'Message', type: 'textarea', required: true, hint: 'Use {contact_name} to insert the contact\'s name.' },
    { key: 'type', label: 'Notification type', type: 'select', options: [
      { value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'success', label: 'Success' },
    ]},
  ]},
  { value: 'send_webhook', label: 'Send webhook', fields: [
    { key: 'url', label: 'Webhook URL', type: 'text', required: true, hint: 'Supports {{contact.field}} tokens.' },
    { key: 'method', label: 'HTTP method', type: 'select', options: [
      { value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' }, { value: 'PUT', label: 'PUT' },
    ]},
    { key: 'bodyTemplate', label: 'Body template (JSON, optional)', type: 'textarea' },
  ]},
  { value: 'send_whatsapp_voice', label: 'Send WhatsApp voice note', fields: [
    { key: 'senderId', label: 'Sender (team member)', type: 'member' },
    { key: 'audioUrl', label: 'Audio URL', type: 'text', required: true },
    { key: 'transcript', label: 'Transcript', type: 'textarea' },
    { key: 'sendTranscript', label: 'Send transcript as follow-up message', type: 'boolean' },
  ]},
  { value: 'create_opportunity', label: 'Create opportunity', fields: [
    { key: 'stageId', label: 'Pipeline stage (optional — defaults to first stage)', type: 'pipelineStage' },
    { key: 'title', label: 'Opportunity title (optional)', type: 'text' },
    { key: 'value', label: 'Deal value', type: 'number' },
  ]},
  { value: 'create_invoice', label: 'Create invoice', fields: [
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'currency', label: 'Currency', type: 'select', options: [
      { value: 'ZAR', label: 'ZAR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' },
    ]},
    { key: 'dueInDays', label: 'Due in (days)', type: 'number' },
  ]},
  { value: 'send_invoice', label: 'Send invoice', fields: [
    { key: 'emailSubject', label: 'Email subject (optional)', type: 'text', hint: 'Supports {{contact.field}} and {{invoice.field}} tokens. Defaults to a standard subject line.' },
    { key: 'emailBody', label: 'Email body (HTML, optional)', type: 'textarea', hint: 'Supports {{contact.field}} and {{invoice.field}} tokens. Defaults to a standard message. Looks up the contact\'s most recent draft invoice — run this after a Create invoice step.' },
  ]},
  { value: 'assign_salesperson', label: 'Assign salesperson', fields: [
    { key: 'ownerId', label: 'Team member', type: 'member', required: true },
  ]},
  { value: 'notify_slack', label: 'Notify Slack', fields: [
    { key: 'webhookUrl', label: 'Slack webhook URL', type: 'text', required: true },
    { key: 'message', label: 'Message', type: 'text', hint: 'Use {contact_name} to insert the contact\'s name.' },
  ]},
  { value: 'generate_ai_task', label: 'Generate AI follow-up task', fields: [
    { key: 'context', label: 'Extra context for the AI (optional)', type: 'textarea' },
  ]},
];

export function getActionDef(type: string): ActionDef | undefined {
  return STEP_TYPES.find((a) => a.value === type);
}
