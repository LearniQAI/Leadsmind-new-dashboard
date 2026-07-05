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

// Helper to convert AppError to a safe client response
// Never expose internal details to the frontend
export function toClientError(error: unknown): {
  error: string;
  code: string;
  status: number
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      status: error.httpStatus,
    };
  }
  // Unknown errors never expose their message
  return {
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
    status: 500,
  };
}
