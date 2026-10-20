import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { campaignQueue } from './queue/campaign.queue.js';

const app = createApp();

// Start background worker in same process during local development / unified deploy
campaignQueue.startWorker();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Bizletix API server started`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    apiBaseUrl: env.API_BASE_URL,
    trackingUrl: env.PUBLIC_TRACKING_BASE_URL,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
