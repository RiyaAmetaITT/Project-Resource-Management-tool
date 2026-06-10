import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Global Express error handler — maps AppError to structured JSON responses.
 * All unhandled errors become a 500 with a safe generic message.
 * Must have 4 parameters so Express recognises it as an error handler.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Log the unexpected error for debugging, but never expose internals to the client
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
  });
}
