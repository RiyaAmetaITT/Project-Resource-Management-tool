import { AppError } from '../../../../server/src/errors/AppError';

describe('AppError', () => {
  it('creates error with message and status code', () => {
    const err = new AppError('Something went wrong', 418);
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it.each([
    ['badRequest', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['notFound', 404],
    ['conflict', 409],
  ] as const)('static %s returns correct status', (factory, code) => {
    const err = AppError[factory]('test message');
    expect(err.statusCode).toBe(code);
    expect(err.message).toBe('test message');
  });
});
