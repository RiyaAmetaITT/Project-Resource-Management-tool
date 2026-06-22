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

export function getAuthenticatedUser(req: AuthenticatedRequest): {
  userId: number;
  role: Role;
} {
  if (!req.user) {
    throw AppError.unauthorized('Not authenticated.');
  }
  return req.user;
}

interface JwtPayload {
  userId: number;
  role: Role;
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next(AppError.unauthorized('No token provided.'));
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (_err) {
    next(AppError.unauthorized('Invalid or expired token.'));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    authMiddleware(req, res, (err) => {
      if (err) return next(err);
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return next(AppError.forbidden('You do not have permission to access this resource.'));
      }
      next();
    });
  };
}
