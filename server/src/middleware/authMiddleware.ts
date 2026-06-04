import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';
import { Role } from '../types/enums';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: Role;
  };
}

interface JwtPayload {
  userId: number;
  role: Role;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No token provided.'));
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error('JWT_SECRET is not configured.'));

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token.'));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    authMiddleware(req, _res, (err) => {
      if (err) return next(err);
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return next(AppError.forbidden('You do not have permission to access this resource.'));
      }
      next();
    });
  };
}
