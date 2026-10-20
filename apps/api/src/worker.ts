import { campaignQueue } from './queue/campaign.queue.js';
import { logger } from './lib/logger.js';

logger.info('🚀 Bizletix Background Worker starting up...');

const worker = campaignQueue.startWorker();

if (worker) {
  logger.info('Bizletix BullMQ Worker active and listening for campaign jobs');
} else {
  logger.info('Bizletix Worker initialized in standalone queue mode');
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received: closing worker');
  if (worker) {
    await worker.close();
  }
  process.exit(0);
});
