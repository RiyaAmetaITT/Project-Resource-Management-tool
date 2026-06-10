import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireRole,
  AuthenticatedRequest,
} from '../../../../server/src/middleware/authMiddleware';
import { Role } from '../../../../server/src/types/enums';

function mockReq(headers: Record<string, string> = {}): AuthenticatedRequest {
  return { headers } as AuthenticatedRequest;
}

function runMiddleware(
  middleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void,
  req: AuthenticatedRequest,
): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req, {} as Response, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

describe('authMiddleware', () => {
  it('rejects missing Authorization header', async () => {
    await expect(runMiddleware(authMiddleware, mockReq())).rejects.toMatchObject({
      statusCode: 401,
      message: 'No token provided.',
    });
  });

  it('rejects invalid token', async () => {
    await expect(
      runMiddleware(authMiddleware, mockReq({ authorization: 'Bearer invalid' })),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('attaches user payload on valid token', async () => {
    const token = jwt.sign({ userId: 42, role: Role.ADMIN }, process.env.JWT_SECRET!);
    const req = mockReq({ authorization: `Bearer ${token}` });
    await runMiddleware(authMiddleware, req);
    expect(req.user).toEqual({ userId: 42, role: Role.ADMIN });
  });
});

describe('requireRole', () => {
  it('allows matching role', async () => {
    const token = jwt.sign({ userId: 1, role: Role.MANAGER }, process.env.JWT_SECRET!);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const guard = requireRole(Role.MANAGER);
    await runMiddleware(guard, req);
    expect(req.user?.role).toBe(Role.MANAGER);
  });

  it('rejects wrong role', async () => {
    const token = jwt.sign({ userId: 1, role: Role.EMPLOYEE }, process.env.JWT_SECRET!);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const guard = requireRole(Role.ADMIN);
    await expect(runMiddleware(guard, req)).rejects.toMatchObject({ statusCode: 403 });
  });
});
