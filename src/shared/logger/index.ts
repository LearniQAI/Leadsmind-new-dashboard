import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
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
  // Pretty print in development, JSON in production
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Typed child logger factory for module-specific logging
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

// Usage examples:
// logger.info({ userId, workspaceId }, 'contact.created')
// logger.error({ err, workspaceId }, 'webhook.dispatch.failed')
// logger.warn({ userId }, 'auth.rate_limit_approaching')
