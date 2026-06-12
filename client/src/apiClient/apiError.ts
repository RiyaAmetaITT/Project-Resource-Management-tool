export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}
