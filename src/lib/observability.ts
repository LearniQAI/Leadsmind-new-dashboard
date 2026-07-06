// Observability & Tracing Layer
// Integrates with Sentry (if configured) or falls back to structured JSON logging for Vercel/Datadog.

import { logger } from '@/shared/logger';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

interface TraceContext {
  provider?: string;
  campaign_id?: string;
  workspace_id?: string;
  contact_id?: string;
  job_id?: string;
  message_id?: string;
  [key: string]: any;
}

export const Observability = {
  /**
   * Log an operational event with structured tracing
   */
  logEvent: (name: string, context: TraceContext = {}) => {
    logger.info({ ...context }, name);

    // Sentry.addBreadcrumb({ category: 'ops', message: name, data: context });
  },

  /**
   * Log an error with severity fingerprinting
   */
  captureError: (error: Error | string, severity: AlertSeverity, context: TraceContext = {}) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const payload = {
      error: errorMessage,
      stack,
      ...context
    };

    if (severity === 'critical' || severity === 'error') {
      logger.error(payload, `observability.${severity}`);
    } else {
      logger.warn(payload, `observability.${severity}`);
    }

    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //    Sentry.withScope(scope => {
    //      scope.setLevel(severity as Sentry.SeverityLevel);
    //      scope.setExtras(context);
    //      scope.setFingerprint([errorMessage, context.provider || 'unknown']);
    //      Sentry.captureException(typeof error === 'string' ? new Error(error) : error);
    //    });
    // }
  },

  /**
   * Wrap an async worker/job to trace execution time and catch fatal crashes
   */
  traceWorker: async <T>(workerName: string, context: TraceContext, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    Observability.logEvent(`${workerName}_started`, context);
    try {
      const result = await fn();
      const duration = performance.now() - start;
      Observability.logEvent(`${workerName}_completed`, { ...context, duration_ms: Math.round(duration) });
      return result;
    } catch (err: any) {
      const duration = performance.now() - start;
      Observability.captureError(err, 'critical', { ...context, worker: workerName, duration_ms: Math.round(duration) });
      throw err;
    }
  }
};
