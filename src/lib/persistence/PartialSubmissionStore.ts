// PartialSubmissionStore — handles database read/write actions for partial submissions

export interface SavePartialPayload {
  stepId: string;
  values: Record<string, any>;
  completionPercentage: number;
  email?: string;
  recoveryToken?: string;
  recoveryTokenExpiresAt?: Date;
  metadata?: any;
}

export const PartialSubmissionStore = {
  /**
   * Save or update a partial submission in the database
   */
  async savePartial(
    formId: string,
    sessionId: string,
    payload: SavePartialPayload,
    _customClient?: any
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const response = await fetch(`/api/public/forms/${formId}/partial`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ formId, sessionId, ...payload }) });
      const result = await response.json();
      return response.ok ? { success: true, data: result.data } : { success: false, error: result.error };
    } catch (err) {
      console.error('[PartialSubmissionStore] Unexpected save error:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Load partial submission by form and session ID
   */
  async loadPartialBySession(
    formId: string,
    sessionId: string,
    _customClient?: any
  ): Promise<any | null> {
    try {
      const response = await fetch(`/api/public/forms/${formId}/partial?sessionId=${encodeURIComponent(sessionId)}`, { credentials: 'same-origin' });
      return response.ok ? (await response.json()).data : null;
    } catch {
      return null;
    }
  },

  /**
   * Load partial submission by recovery token (used on recovery resume endpoints)
   */
  async loadPartialByToken(
    formId: string,
    token: string,
    _customClient?: any
  ): Promise<any | null> {
    try {
      const response = await fetch(`/api/public/forms/${formId}/partial?recoveryToken=${encodeURIComponent(token)}`, { credentials: 'same-origin' });
      return response.ok ? (await response.json()).data : null;
    } catch {
      return null;
    }
  },

  /**
   * Delete partial submission once completed
   */
  async deletePartial(
    formId: string,
    sessionId: string,
    _customClient?: any
  ): Promise<void> {
    try {
      await fetch(`/api/public/forms/${formId}/partial?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE', credentials: 'same-origin' });
    } catch (err) {
      console.error('[PartialSubmissionStore] Delete error:', err);
    }
  }
};
