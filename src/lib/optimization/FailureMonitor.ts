/**
 * FailureMonitor — registers global error boundaries, hooks uncaught exceptions,
 * and logs runtime issues to DiagnosticsService.
 */

import { DiagnosticsService } from './DiagnosticsService';

export const FailureMonitor = {
  privateEnabled: false,

  /**
   * Initialize global listeners for uncaught client failures.
   */
  startGlobalMonitoring(formId: string) {
    if (this.privateEnabled || typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      DiagnosticsService.logError(
        formId,
        'runtime',
        event.message || 'Global uncaught script error',
        'window.onerror',
        { filename: event.filename, lineno: event.lineno }
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
      DiagnosticsService.logError(
        formId,
        'runtime',
        `Unhandled Promise Rejection: ${msg}`,
        'window.unhandledrejection',
        { reason: msg }
      );
    });

    this.privateEnabled = true;
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[FailureMonitor] Global error instrumentation active.');
    }
  }
};
