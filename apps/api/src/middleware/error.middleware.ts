import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
  });

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as Record<string, unknown>).status || 500;

  res.status(Number(status)).json({
    success: false,
    error: {
      code: (err as Record<string, unknown>).code || 'INTERNAL_ERROR',
      message: status === 500 && process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : message,
    },
  });
}
