import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.Bizletix_session;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      res.clearCookie('Bizletix_session');
      res.status(401).json({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' },
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
