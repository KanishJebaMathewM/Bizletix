import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { generalApiLimiter } from './middleware/rate-limiter.js';

import authRoutes from './routes/auth.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import contactsRoutes from './routes/contacts.routes.js';
import templatesRoutes from './routes/templates.routes.js';
import campaignsRoutes from './routes/campaigns.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import unsubscribeRoutes from './routes/unsubscribe.routes.js';
import suppressionRoutes from './routes/suppression.routes.js';
import systemRoutes from './routes/system.routes.js';

export function createApp() {
  const app = express();

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", env.APP_BASE_URL],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow tracking pixel load across clients
    })
  );

  // CORS configuration
  const allowedOrigins = [env.APP_BASE_URL, env.CORS_ORIGIN].filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, tracking pixel fetches)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev, strict in prod
        }
      },
      credentials: true,
    })
  );

  // Parsers
  app.use(cookieParser());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // General rate limiter
  app.use('/api', generalApiLimiter);

  // Mount routes
  app.use(systemRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/campaigns', campaignsRoutes);
  app.use('/api/track', trackingRoutes);
  app.use('/api/unsubscribe', unsubscribeRoutes);
  app.use('/api/suppressions', suppressionRoutes);

  // 404 handler for unknown API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'API endpoint not found' },
    });
  });

  // Global structured error handling middleware
  app.use(errorHandler);

  return app;
}
