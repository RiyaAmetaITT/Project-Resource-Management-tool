export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message: string): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string): AppError {
    return new AppError(message, 403);
  }

  static notFound(message: string): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }
}
