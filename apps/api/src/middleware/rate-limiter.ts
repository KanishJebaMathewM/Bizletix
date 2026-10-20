import rateLimit from 'express-rate-limit';

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please slow down and try again shortly.',
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});

export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1200, // High throughput for email tracking endpoints
  standardHeaders: true,
  legacyHeaders: false,
});
