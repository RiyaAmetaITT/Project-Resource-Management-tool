import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../../server/src/middleware/errorHandler';
import { AppError } from '../../../../server/src/errors/AppError';

function mockRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('errorHandler', () => {
  const req = {} as Request;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps AppError to structured JSON with correct status', () => {
    const res = mockRes();
    errorHandler(AppError.notFound('User not found'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('returns 500 for unexpected errors', () => {
    const res = mockRes();
    errorHandler(new Error('DB exploded'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'An unexpected error occurred.',
    });
  });
});
