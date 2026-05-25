export const TRIGGER_TYPES = [
  { id: 'lead_imported', label: 'Lead Imported', description: 'Triggers when a new lead is imported from LeadsFinder.' },
  { id: 'form_submitted', label: 'Form Submitted', description: 'Triggers when a prospect submits a linked form.' },
  { id: 'contact_created', label: 'Contact Created', description: 'Triggers when a new contact is added to the CRM.' },
  { id: 'opportunity_created', label: 'Opportunity Created', description: 'Triggers when a new deal enters the pipeline.' },
  { id: 'opportunity_stage_changed', label: 'Opportunity Stage Changed', description: 'Triggers when a deal moves to a new stage.' },
  { id: 'watchlist_alert', label: 'Watchlist Alert Triggered', description: 'Triggers when a monitored market event occurs.' }
];

export class TriggerRegistry {
  public static getSupportedTriggers() {
    return TRIGGER_TYPES;
  }
}
