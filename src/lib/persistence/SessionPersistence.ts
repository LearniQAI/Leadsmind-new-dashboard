// SessionPersistence — local browser persistence layer
// Primary: sessionStorage, Fallback: localStorage
// Includes simple cross-tab versioning scaffold

const STORAGE_KEY_PREFIX = 'lm_form_session_';

interface SavedSession {
  formId: string;
  stepId: string;
  values: Record<string, any>;
  timestamp: number;
  version: number;
}

export const SessionPersistence = {
  /**
   * Save progress locally to browser storage
   */
  saveLocal(formId: string, stepId: string, values: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const data: SavedSession = {
      formId,
      stepId,
      values,
      timestamp: Date.now(),
      version: 1, // incremental tab sync check version
    };

    const serialized = JSON.stringify(data);
    const key = `${STORAGE_KEY_PREFIX}${formId}`;

    try {
      window.sessionStorage.setItem(key, serialized);
    } catch (e) {
      // Fallback to localStorage if sessionStorage fails or is disabled
      try {
        window.localStorage.setItem(key, serialized);
      } catch (err) {
        console.warn('[SessionPersistence] Browser storage is unavailable:', err);
      }
    }
  },

  /**
   * Load local backup progress
   */
  loadLocal(formId: string): SavedSession | null {
    if (typeof window === 'undefined') return null;

    const key = `${STORAGE_KEY_PREFIX}${formId}`;
    let dataStr: string | null = null;

    try {
      dataStr = window.sessionStorage.getItem(key);
      if (!dataStr) {
        dataStr = window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('[SessionPersistence] Failed to read from browser storage:', e);
    }

    if (!dataStr) return null;

    try {
      const parsed = JSON.parse(dataStr) as SavedSession;
      if (parsed && parsed.formId === formId) {
        return parsed;
      }
    } catch {
      // Invalid format, clear it
      this.clearLocal(formId);
    }

    return null;
  },

  /**
   * Clear local backup progress
   */
  clearLocal(formId: string): void {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_KEY_PREFIX}${formId}`;
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn('[SessionPersistence] Failed to clear storage:', e);
    }
  }
};
