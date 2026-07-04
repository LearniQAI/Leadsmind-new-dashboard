export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
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
