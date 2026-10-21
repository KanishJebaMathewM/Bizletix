import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { EmailSenderService } from '../services/email-sender.service.js';
import { TrackingService } from '../services/tracking.service.js';
import {
  renderMergeText,
  buildTrackingPixelHtml,
  buildUnsubscribeFooter,
} from '@bizletix/shared';

const QUEUE_NAME = 'Bizletix-campaigns';

// Try creating Redis connection
let redisClient: Redis | null = null;
let campaignBullQueue: Queue | null = null;
let campaignBullWorker: Worker | null = null;

if (env.REDIS_URL && env.REDIS_URL !== 'none') {
  try {
    const candidateRedis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: () => null, // do not continuously retry if Redis server is down
      lazyConnect: true,
    });

    candidateRedis.on('error', () => {
      // absorb connection errors silently to allow memory-queue fallback
    });

    candidateRedis
      .connect()
      .then(() => {
        logger.info('Connected to Redis for BullMQ persistent queue');
        redisClient = candidateRedis;
        campaignBullQueue = new Queue(QUEUE_NAME, { connection: redisClient as any });
      })
      .catch(() => {
        logger.info('Redis not available; operating in memory-queue mode');
        try {
          candidateRedis.disconnect();
        } catch {
          // ignore
        }
      });
  } catch {
    logger.info('Redis not configured; operating in memory-queue mode');
  }
}

/**
 * Core campaign execution logic — runs either in BullMQ worker or in-memory runner
 */
export async function processCampaignJob(campaignId: string): Promise<void> {
  logger.info('Starting execution of campaign', { campaignId });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    logger.error('Campaign not found during queue processing', { campaignId });
    return;
  }

  // Update status to sending
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'sending', startedAt: campaign.startedAt ?? new Date() },
  });

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: 'queued' },
    include: {
      contact: true,
      trackingTokens: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const delayMs = env.DEFAULT_SEND_DELAY_MS;

  for (const recipient of recipients) {
    // Check if campaign was paused or cancelled by user in the meantime
    const currentStatus = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (currentStatus?.status === 'paused' || currentStatus?.status === 'cancelled') {
      logger.info(`Campaign ${campaignId} was ${currentStatus.status}; stopping processing`);
      return;
    }

    // Mark recipient sending
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: 'sending' },
    });

    try {
      const contact = recipient.contact;
      const custom = (contact?.customFields as Record<string, string>) || {};
      const mergeData = {
        email: recipient.recipientEmail,
        name: contact?.name,
        firstName: contact?.firstName,
        lastName: contact?.lastName,
        ...custom,
      };

      const resolvedSubject = renderMergeText(campaign.subject, mergeData, { escapeForHtml: false });
      let resolvedHtml = renderMergeText(campaign.htmlBody, mergeData, { escapeForHtml: false });
      let resolvedText = campaign.textBody ? renderMergeText(campaign.textBody, mergeData, { escapeForHtml: false }) : null;

      // Handle click tracking
      if (campaign.trackingClickEnabled) {
        resolvedHtml = await TrackingService.rewriteLinksForTracking(recipient.id, resolvedHtml);
      }

      // Handle open tracking pixel
      if (campaign.trackingOpenEnabled) {
        const openTokenRecord = recipient.trackingTokens.find((t) => t.tokenType === 'open');
        if (openTokenRecord) {
          // Find or get token
          const openPixel = buildTrackingPixelHtml(env.PUBLIC_TRACKING_BASE_URL, openTokenRecord.tokenHash);
          resolvedHtml += openPixel;
        }
      }

      // Handle unsubscribe link
      if (campaign.includeUnsubscribe) {
        const unsubTokenRecord = recipient.trackingTokens.find((t) => t.tokenType === 'unsubscribe');
        if (unsubTokenRecord) {
          const unsubHtml = buildUnsubscribeFooter(env.PUBLIC_TRACKING_BASE_URL, unsubTokenRecord.tokenHash, true);
          resolvedHtml += unsubHtml;

          if (resolvedText) {
            resolvedText += buildUnsubscribeFooter(env.PUBLIC_TRACKING_BASE_URL, unsubTokenRecord.tokenHash, false);
          }
        }
      }

      // Attempt send
      const sendResult = await EmailSenderService.send({
        senderConnectionId: campaign.senderConnectionId,
        toEmail: recipient.recipientEmail,
        replyTo: campaign.replyTo,
        subject: resolvedSubject,
        htmlBody: resolvedHtml,
        textBody: resolvedText,
      });

      if (sendResult.success) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'accepted_by_provider',
            providerMessageId: sendResult.providerMessageId || null,
            acceptedAt: new Date(),
          },
        });
      } else {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'send_failed',
            failureCode: sendResult.failureCode || 'SEND_FAILED',
            failureMessage: sendResult.failureMessage || 'Unknown sending failure',
            failedAt: new Date(),
          },
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'send_failed',
          failureCode: 'SEND_EXCEPTION',
          failureMessage: errorMessage,
          failedAt: new Date(),
        },
      });
    }

    // Rate limiting pacing
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Check remaining queued recipients
  const remainingCount = await prisma.campaignRecipient.count({
    where: { campaignId, status: 'queued' },
  });

  if (remainingCount === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'completed', completedAt: new Date() },
    });
    logger.info('Campaign completed successfully', { campaignId });
  }
}

/**
 * Queue management abstraction
 */
export class CampaignQueue {
  async enqueueCampaign(campaignId: string) {
    if (campaignBullQueue) {
      try {
        await campaignBullQueue.add('send-campaign', { campaignId }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        });
        logger.info('Enqueued campaign into BullMQ', { campaignId });
        return;
      } catch (err) {
        logger.warn('Failed to enqueue in BullMQ, falling back to background runner', {
          error: (err as Error).message,
        });
      }
    }

    // Asynchronous background execution fallback
    setImmediate(() => {
      processCampaignJob(campaignId).catch((err) => {
        logger.error('Background campaign execution failed', { campaignId, error: err.message });
      });
    });
  }

  startWorker() {
    if (!redisClient) return null;
    try {
      campaignBullWorker = new Worker(
        QUEUE_NAME,
        async (job: Job<{ campaignId: string }>) => {
          await processCampaignJob(job.data.campaignId);
        },
        { connection: redisClient as any, concurrency: 2 }
      );

      campaignBullWorker.on('completed', (job) => {
        logger.info('BullMQ worker completed job', { jobId: job.id });
      });

      campaignBullWorker.on('failed', (job, err) => {
        logger.error('BullMQ worker failed job', { jobId: job?.id, error: err.message });
      });

      return campaignBullWorker;
    } catch {
      logger.info('Worker running in in-memory mode');
      return null;
    }
  }
}

export const campaignQueue = new CampaignQueue();
