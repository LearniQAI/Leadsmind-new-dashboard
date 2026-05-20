export interface AnalyticsEvent {
  formId: string;
  workspaceId: string;
  sessionId: string;
  eventType: 'view' | 'field_focus' | 'field_complete' | 'step_complete' | 'submit' | 'abandon';
  fieldId?: string;
  stepId?: string;
  variantId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export class EventPipeline {
  private queue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private endpoint: string = '/api/public/analytics/track';

  constructor(flushIntervalMs: number = 3000) {
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
      
      // Flush on unload
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
      
      // Flush on visibility change (backgrounding on mobile)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush(true);
        }
      });
    }
  }

  public track(event: AnalyticsEvent) {
    this.queue.push(event);
    if (this.queue.length >= 20) {
      this.flush();
    }
  }

  public async flush(useBeacon: boolean = false) {
    if (this.queue.length === 0 || this.isFlushing) return;

    const eventsToProcess = [...this.queue];
    this.queue = []; // clear early to prevent race conditions

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ events: eventsToProcess })], { type: 'application/json' });
      navigator.sendBeacon(this.endpoint, blob);
      return;
    }

    this.isFlushing = true;
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToProcess }),
        keepalive: true,
      });
    } catch (err) {
      console.warn('[Analytics] Failed to flush events', err);
      // Re-queue events if not a beacon
      this.queue = [...eventsToProcess, ...this.queue];
    } finally {
      this.isFlushing = false;
    }
  }

  public destroy() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flush(true);
  }
}

// Global singleton instance
export const globalEventPipeline = new EventPipeline();
