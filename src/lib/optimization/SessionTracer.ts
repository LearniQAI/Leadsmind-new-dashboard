/**
 * SessionTracer — tracks live runtime page session timings, networks offline shifts,
 * and monitors critical failure counts.
 */

import { DiagnosticsService } from './DiagnosticsService';

export const SessionTracer = {
  privateSessionId: '',
  privateIsOffline: false,

  /**
   * Initializes session logging metrics.
   */
  startTrace(formId: string): string {
    if (typeof window === 'undefined') return '';

    this.privateSessionId = Math.random().toString(36).substring(2, 15);
    this.privateIsOffline = !window.navigator.onLine;

    // Track network online/offline toggle events
    window.addEventListener('online', () => {
      this.privateIsOffline = false;
      DiagnosticsService.logError(
        formId,
        'realtime',
        'Session connection re-established online.',
        'SessionTracer',
        { sessionId: this.privateSessionId }
      );
    });

    window.addEventListener('offline', () => {
      this.privateIsOffline = true;
      DiagnosticsService.logError(
        formId,
        'realtime',
        'Session connection lost offline.',
        'SessionTracer',
        { sessionId: this.privateSessionId }
      );
    });

    return this.privateSessionId;
  },

  /**
   * Tracks upload latency and logs failures if any occur.
   */
  trackUpload(formId: string, fileSize: number, success: boolean, errorMsg?: string) {
    if (!success) {
      DiagnosticsService.logError(
        formId,
        'persistence',
        `File upload failed: ${errorMsg || 'Unknown upload rejection'}`,
        'SessionTracer',
        { sessionId: this.privateSessionId, sizeBytes: fileSize }
      );
    }
  },

  /**
   * Evaluates network connectivity status.
   */
  isOffline(): boolean {
    return this.privateIsOffline;
  }
};
