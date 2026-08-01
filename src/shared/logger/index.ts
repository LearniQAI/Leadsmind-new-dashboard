import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'leadsmind',
    env: process.env.NODE_ENV ?? 'development',
  },
  // Never log these fields — security critical
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'authorization',
      'serviceKey',
      'apiKey',
      'api_key',
      'SUPABASE_SERVICE_ROLE_KEY',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
};

// pino-pretty's transport spawns a worker thread. Under Next.js dev-mode
// webpack bundling this worker can fail to resolve its own bootstrap module
// and die (confirmed live: "Cannot find module '...vendor-chunks/lib/worker.js'",
// then "the worker has exited"). ThreadStream reports that failure via an
// async 'error' event, not a synchronous throw — so callers wrapping
// logger.info()/error() in try/catch cannot catch it; unhandled, it becomes
// a process-level uncaughtException that can abort whatever async chain
// happened to be running a log call at the time (confirmed: it silently
// killed automation step execution before it ever reached the DB). This
// only exists in development — transport is `undefined` in production, so
// pino writes synchronously there with no worker thread involved at all.
export const logger = isDevelopment
  ? (() => {
      const transport = pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      });
      // Required by pino's own docs for worker-thread transports: without
      // this listener, a dead worker's 'error' event has no handler and
      // Node promotes it to an uncaughtException.
      transport.on('error', (err) => {
        console.error('[logger] pino-pretty transport failed, logs may be lost:', err?.message ?? err);
      });
      return pino(baseOptions, transport);
    })()
  : pino(baseOptions);

// Typed child logger factory for module-specific logging
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

// Usage examples:
// logger.info({ userId, workspaceId }, 'contact.created')
// logger.error({ err, workspaceId }, 'webhook.dispatch.failed')
// logger.warn({ userId }, 'auth.rate_limit_approaching')
