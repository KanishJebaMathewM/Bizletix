import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { GoogleService } from '../services/google.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rate-limiter.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { emailSchema } from '@bizletix/shared';

const router = Router();

const loginRegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().max(100).optional(),
});

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie('Bizletix_session', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function setOAuthStateCookie(res: Response, value: string) {
  res.cookie('Bizletix_oauth_state', value, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });
}

// Start Google OAuth flow
router.get('/google', async (req: Request, res: Response) => {
  try {
    const sessionUser = await AuthService.validateSession(req.cookies?.Bizletix_session || '');
    const userId = sessionUser?.id || '';
    const { url, state } = GoogleService.generateAuthUrl();
    setOAuthStateCookie(res, GoogleService.createAuthStateCookie(state, userId));
    res.redirect(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google OAuth configuration error';
    res.redirect(`${env.APP_BASE_URL}/login?error=${encodeURIComponent(msg)}`);
  }
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code || !state) {
    res.redirect(`${env.APP_BASE_URL}/login?error=Missing+authorization+code+from+Google`);
    return;
  }

  try {
    const userId = GoogleService.validateAuthState(req.cookies?.Bizletix_oauth_state || '', state);
    res.clearCookie('Bizletix_oauth_state', { path: '/' });
    const connection = await GoogleService.handleAuthCallback(code, userId);
    const { rawToken, expiresAt } = await AuthService.createSession(connection.userId);
    setSessionCookie(res, rawToken, expiresAt);

    res.redirect(`${env.APP_BASE_URL}/dashboard`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google authentication failed';
    res.redirect(`${env.APP_BASE_URL}/login?error=${encodeURIComponent(msg)}`);
  }
});

// Local registration
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = loginRegisterSchema.parse(req.body);
    const user = await AuthService.registerWithPassword(email, password, name);
    const { rawToken, expiresAt } = await AuthService.createSession(user.id);
    setSessionCookie(res, rawToken, expiresAt);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (err: any) {
    if (err.message?.includes("Can't reach database server")) {
      res.status(503).json({
        success: false,
        error: 'Database connection failed. Please start PostgreSQL (docker compose up -d) or configure DATABASE_URL in .env.',
      });
    } else {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Registration failed',
      });
    }
  }
});

// Local login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginRegisterSchema.omit({ name: true }).parse(req.body);
    const user = await AuthService.loginWithPassword(email, password);
    const { rawToken, expiresAt } = await AuthService.createSession(user.id);
    setSessionCookie(res, rawToken, expiresAt);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (err: any) {
    if (err.message?.includes("Can't reach database server")) {
      res.status(503).json({
        success: false,
        error: 'Database connection failed. Please start PostgreSQL (docker compose up -d) or configure DATABASE_URL in .env.',
      });
    } else {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Login failed',
      });
    }
  }
});

// Current user profile
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.Bizletix_session;
  if (token) {
    await AuthService.revokeSession(token);
  }
  res.clearCookie('Bizletix_session');
  res.json({ success: true, message: 'Successfully logged out' });
});

export default router;
