import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Stable, machine-readable error codes the frontend can branch on. */
export type ErrorCode = 'AI_QUOTA_EXCEEDED' | 'AI_AUTH' | 'AI_UNAVAILABLE';

/** Typed application error. Throw from route handlers; `toResponse` maps it to JSON. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
    /** Optional stable code so clients can react without parsing the message. */
    public readonly code?: ErrorCode,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`);
  }
}

/** Turn any thrown error into a clean JSON response. Use in every route handler's catch. */
export function toResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'ValidationError', message: 'Invalid input', details: err.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.name, message: err.message, code: err.code, details: err.details },
      { status: err.statusCode },
    );
  }
  console.error('Unhandled error:', err);
  return NextResponse.json(
    { error: 'InternalServerError', message: 'Something went wrong' },
    { status: 500 },
  );
}
