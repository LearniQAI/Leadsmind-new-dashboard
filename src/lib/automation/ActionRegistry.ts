export const ACTION_TYPES = [
  { id: 'assign_owner', label: 'Assign Owner', requires: ['user_id'] },
  { id: 'add_tag', label: 'Add Tag', requires: ['tag_name'] },
  { id: 'create_opportunity', label: 'Create Opportunity', requires: ['pipeline_stage'] },
  { id: 'create_task', label: 'Create Task', requires: ['task_title'] },
  { id: 'create_notification', label: 'Send Notification', requires: ['message'] },
  { id: 'move_pipeline_stage', label: 'Move Pipeline Stage', requires: ['target_stage'] },
  { id: 'add_to_watchlist', label: 'Add To Watchlist', requires: ['watchlist_id'] }
];

export class ActionRegistry {
  public static getSupportedActions() {
    return ACTION_TYPES;
  }
}
