export const ACTION_TYPES = [
  { id: 'assign_owner', label: 'Assign Owner', requires: ['user_id'] },
  { id: 'add_tag', label: 'Add Tag', requires: ['tag_name'] },
  { id: 'create_opportunity', label: 'Create Opportunity', requires: ['pipeline_stage'] },
  { id: 'create_task', label: 'Create Task', requires: ['task_title'] },
  { id: 'create_notification', label: 'Send Notification', requires: ['message'] },
  { id: 'move_pipeline_stage', label: 'Move Pipeline Stage', requires: ['target_stage'] },
  { id: 'add_to_watchlist', label: 'Add To Watchlist', requires: ['watchlist_id'] },
  // LMS Actions
  { id: 'lms_enroll', label: 'Enroll in Course', requires: ['courseId'] },
  { id: 'lms_enroll_bundle', label: 'Enroll in Bundle', requires: ['bundleId'] },
  { id: 'lms_revoke_access', label: 'Revoke Course/Bundle Access', requires: [] },
  { id: 'update_community_privilege', label: 'Update Community Privilege', requires: ['level'] },
  { id: 'send_whatsapp_template', label: 'Send WhatsApp Template', requires: ['templateName'] }
];

export class ActionRegistry {
  public static getSupportedActions() {
    return ACTION_TYPES;
  }
}
