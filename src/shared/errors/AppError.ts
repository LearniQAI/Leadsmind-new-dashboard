import { friendlyDbError } from './dbErrors';
import { logger } from '@/shared/logger';
import { newRequestId } from '@/shared/logger/requestId';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly httpStatus: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') {
    super('UNAUTHORIZED', msg, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') {
    super('FORBIDDEN', msg, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(msg: string) {
    super('VALIDATION_ERROR', msg, 422);
  }
}

export class DatabaseError extends AppError {
  constructor(msg = 'Database operation failed') {
    super('DB_ERROR', msg, 500);
  }
}

export class ConflictError extends AppError {
  constructor(msg: string) {
    super('CONFLICT', msg, 409);
  }
}

/** The atomic AI-credit ledger rejected a charge because its ceiling is reached. */
export class CreditLimitExceededError extends AppError {
  constructor() {
    super(
      'CREDIT_LIMIT_EXCEEDED',
      'Your workspace has exhausted its available AI credits.',
      402
    );
  }
}

// Helper to convert AppError to a safe client response
// Never expose internal details to the frontend
export function toClientError(error: unknown): {
  error: string;
  code: string;
  status: number;
  /** Present when the real error was logged server-side: quote it to support, it finds the raw error. */
  requestId?: string;
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      status: error.httpStatus,
    };
  }
  // Raw Postgres/PostgREST errors: constraint violations are ordinary, fixable situations, so map the
  // SQLSTATE to a user-safe message. The real error (constraint/column/value) is logged with a
  // request id and never returned.
  const friendly = friendlyDbError(error);
  if (friendly) {
    const requestId = newRequestId();
    logger.error({ err: error, requestId, sqlState: friendly.sqlState }, 'db_error.mapped_for_client');
    return { error: friendly.message, code: friendly.code, status: friendly.status, requestId };
  }
  // Unknown errors never expose their message
  return {
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
    status: 500,
  };
}
