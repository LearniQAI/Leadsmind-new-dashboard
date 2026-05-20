import { globalEventPipeline, AnalyticsEvent } from './EventPipeline';

export class AnalyticsTracker {
  private formId: string;
  private workspaceId: string;
  private sessionId: string;
  private variantId?: string;

  private fieldFocusTimers: Record<string, number> = {};
  private stepStartTimers: Record<string, number> = {};

  constructor(formId: string, workspaceId: string, variantId?: string) {
    this.formId = formId;
    this.workspaceId = workspaceId;
    this.variantId = variantId;
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    let sid = sessionStorage.getItem('lm_session_id');
    if (!sid) {
      sid = 'ses_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('lm_session_id', sid);
    }
    return sid;
  }

  private baseEvent(type: AnalyticsEvent['eventType']): Omit<AnalyticsEvent, 'eventType'> {
    return {
      formId: this.formId,
      workspaceId: this.workspaceId,
      sessionId: this.sessionId,
      variantId: this.variantId,
      timestamp: Date.now()
    };
  }

  public trackView() {
    globalEventPipeline.track({
      ...this.baseEvent('view'),
      eventType: 'view',
      metadata: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      }
    });
  }

  public trackFieldFocus(fieldId: string) {
    if (!this.fieldFocusTimers[fieldId]) {
      this.fieldFocusTimers[fieldId] = Date.now();
      
      globalEventPipeline.track({
        ...this.baseEvent('field_focus'),
        eventType: 'field_focus',
        fieldId
      });
    }
  }

  public trackFieldComplete(fieldId: string) {
    const startTime = this.fieldFocusTimers[fieldId];
    const timeSpent = startTime ? Date.now() - startTime : 0;
    
    // Reset timer to allow tracking re-edits
    delete this.fieldFocusTimers[fieldId];

    globalEventPipeline.track({
      ...this.baseEvent('field_complete'),
      eventType: 'field_complete',
      fieldId,
      metadata: { timeSpentMs: timeSpent }
    });
  }

  public trackStepStart(stepId: string) {
    this.stepStartTimers[stepId] = Date.now();
  }

  public trackStepComplete(stepId: string) {
    const startTime = this.stepStartTimers[stepId];
    const timeSpent = startTime ? Date.now() - startTime : 0;

    globalEventPipeline.track({
      ...this.baseEvent('step_complete'),
      eventType: 'step_complete',
      stepId,
      metadata: { timeSpentMs: timeSpent }
    });
  }

  public trackSubmit() {
    globalEventPipeline.track({
      ...this.baseEvent('submit'),
      eventType: 'submit'
    });
    // Immediately flush on submit to ensure it's recorded
    globalEventPipeline.flush();
  }

  public trackAbandonment(lastStepId?: string, lastFieldId?: string) {
    globalEventPipeline.track({
      ...this.baseEvent('abandon'),
      eventType: 'abandon',
      stepId: lastStepId,
      fieldId: lastFieldId
    });
    globalEventPipeline.flush(true);
  }
}
