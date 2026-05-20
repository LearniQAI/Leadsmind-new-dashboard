// PersistenceEngine — coordinates local and database progress saving
import { SessionPersistence } from './SessionPersistence';
import { PartialSubmissionStore } from './PartialSubmissionStore';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface PersistenceConfig {
  formId: string;
  sessionId: string;
  autoSaveEnabled: boolean;
  debounceMs?: number;
  onStateChange?: (state: SaveState) => void;
}

export class PersistenceEngine {
  private config: PersistenceConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastSavedValues: string = '{}';
  private currentState: SaveState = 'idle';

  constructor(config: PersistenceConfig) {
    this.config = config;
    this.config.debounceMs = config.debounceMs || 2000;
  }

  private setState(state: SaveState) {
    this.currentState = state;
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }

  public getState(): SaveState {
    return this.currentState;
  }

  /**
   * Queue progress to be saved. Auto-saves to DB after debounce delay if enabled,
   * but immediately backs up to browser storage.
   */
  public trackChange(
    stepId: string,
    values: Record<string, any>,
    completionPercentage: number,
    email?: string
  ) {
    // 1. Immediately save progress to browser storage (offline backup)
    SessionPersistence.saveLocal(this.config.formId, stepId, values);

    if (!this.config.autoSaveEnabled) return;

    // Compare with last saved to avoid redundant writes
    const valuesStr = JSON.stringify(values);
    if (valuesStr === this.lastSavedValues) return;

    this.setState('saving');

    // 2. Clear previous DB queue and schedule new save
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      // Check offline status
      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        console.warn('[PersistenceEngine] Device is offline. Retaining local backup.');
        this.setState('saved'); // locally saved
        return;
      }

      const res = await PartialSubmissionStore.savePartial(
        this.config.formId,
        this.config.sessionId,
        {
          stepId,
          values,
          completionPercentage,
          email,
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            lastActiveAt: new Date().toISOString(),
          }
        }
      );

      if (res.success) {
        this.lastSavedValues = valuesStr;
        this.setState('saved');
      } else {
        this.setState('error');
      }
    }, this.config.debounceMs);
  }

  /**
   * Flush any pending saves immediately
   */
  public forceFlush(
    stepId: string,
    values: Record<string, any>,
    completionPercentage: number,
    email?: string
  ) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (!this.config.autoSaveEnabled) {
      SessionPersistence.saveLocal(this.config.formId, stepId, values);
      return;
    }

    this.setState('saving');
    PartialSubmissionStore.savePartial(
      this.config.formId,
      this.config.sessionId,
      {
        stepId,
        values,
        completionPercentage,
        email,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          lastActiveAt: new Date().toISOString(),
          forced: true
        }
      }
    ).then((res) => {
      if (res.success) {
        this.lastSavedValues = JSON.stringify(values);
        this.setState('saved');
      } else {
        this.setState('error');
      }
    });
  }

  public destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
