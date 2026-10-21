import { prisma } from '../lib/prisma.js';
import { generateSecureToken, hashToken } from '../config/crypto.js';
import { env } from '../config/env.js';
import {
  isValidRedirectUrl,
} from '@bizletix/shared';
import { logger } from '../lib/logger.js';
import { Prisma } from '@prisma/client';

// 1x1 transparent GIF 43 bytes
export const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export class TrackingService {
  /**
   * Create an open tracking token for a recipient
   */
  static async createOpenToken(
    campaignRecipientId: string,
    database: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<string> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await database.trackingToken.create({
      data: {
        campaignRecipientId,
        tokenHash,
        tokenType: 'open',
      },
    });

    return rawToken;
  }

  /**
   * Create an unsubscribe token for a recipient
   */
  static async createUnsubscribeToken(
    campaignRecipientId: string,
    database: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<string> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await database.trackingToken.create({
      data: {
        campaignRecipientId,
        tokenHash,
        tokenType: 'unsubscribe',
      },
    });

    return rawToken;
  }

  /**
   * Create click tracking tokens and rewrite <a> links in HTML
   */
  static async rewriteLinksForTracking(
    campaignRecipientId: string,
    html: string
  ): Promise<string> {
    const publicBase = env.PUBLIC_TRACKING_BASE_URL.replace(/\/+$/, '');
    
    // Match href attributes in anchor tags: <a ... href="URL" ...>
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']([^>]*)>/gi;
    const matches: Array<{ fullMatch: string; originalUrl: string; afterAttrs: string }> = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const originalUrl = match[1]?.trim();
      if (
        originalUrl &&
        !originalUrl.startsWith('#') &&
        !originalUrl.startsWith('mailto:') &&
        !originalUrl.startsWith('tel:') &&
        !originalUrl.includes('/api/unsubscribe/') &&
        isValidRedirectUrl(originalUrl)
      ) {
        matches.push({
          fullMatch: match[0],
          originalUrl,
          afterAttrs: match[2] || '',
        });
      }
    }

    let modifiedHtml = html;

    for (const item of matches) {
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);

      await prisma.trackingToken.create({
        data: {
          campaignRecipientId,
          tokenHash,
          tokenType: 'click',
          destinationUrl: item.originalUrl,
        },
      });

      const trackingUrl = `${publicBase}/api/track/click/${encodeURIComponent(rawToken)}`;
      const replacement = item.fullMatch.replace(item.originalUrl, trackingUrl);
      modifiedHtml = modifiedHtml.replace(item.fullMatch, replacement);
    }

    return modifiedHtml;
  }

  /**
   * Process open tracking pixel request
   */
  static async recordOpenEvent(
    rawToken: string,
    metadata?: { userAgent?: string }
  ): Promise<Buffer> {
    try {
      const tokenHash = hashToken(rawToken);
      const tokenRecord = await prisma.trackingToken.findUnique({
        where: { tokenHash },
        include: {
          campaignRecipient: {
            include: { campaign: true },
          },
        },
      });

      if (!tokenRecord || tokenRecord.tokenType !== 'open') {
        // Return 1x1 GIF anyway to not break email rendering
        return TRANSPARENT_1X1_GIF;
      }

      // Check if campaign has open tracking enabled
      if (!tokenRecord.campaignRecipient.campaign.trackingOpenEnabled) {
        return TRANSPARENT_1X1_GIF;
      }

      // Minimize user agent to avoid privacy fingerprinting
      let minimizedAgent = 'Unknown';
      if (metadata?.userAgent) {
        const ua = metadata.userAgent.toLowerCase();
        if (ua.includes('applewebkit')) minimizedAgent = 'WebKit/Safari';
        else if (ua.includes('googleimageproxy')) minimizedAgent = 'GoogleImageProxy';
        else if (ua.includes('thunderbird')) minimizedAgent = 'Thunderbird';
        else if (ua.includes('outlook')) minimizedAgent = 'Outlook';
        else minimizedAgent = 'Generic-Email-Client';
      }

      // 5-minute deduplication window to avoid noise from rapid consecutive fetches
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOpen = await prisma.trackingEvent.findFirst({
        where: {
          campaignRecipientId: tokenRecord.campaignRecipientId,
          eventType: 'open',
          occurredAt: { gte: fiveMinutesAgo },
        },
      });

      if (!recentOpen) {
        await prisma.trackingEvent.create({
          data: {
            campaignRecipientId: tokenRecord.campaignRecipientId,
            eventType: 'open',
            limitedMetadata: {
              client: minimizedAgent,
            },
          },
        });

        logger.debug('Detected email open event recorded', {
          recipientId: tokenRecord.campaignRecipientId,
          campaignId: tokenRecord.campaignRecipient.campaignId,
        });
      }
    } catch (err) {
      logger.error('Error processing open tracking token', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return TRANSPARENT_1X1_GIF;
  }

  /**
   * Process click tracking redirect
   */
  static async recordClickEvent(
    rawToken: string,
    metadata?: { userAgent?: string }
  ): Promise<string> {
    const tokenHash = hashToken(rawToken);
    const tokenRecord = await prisma.trackingToken.findUnique({
      where: { tokenHash },
      include: {
        campaignRecipient: {
          include: { campaign: true },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.tokenType !== 'click' ||
      !tokenRecord.destinationUrl ||
      !isValidRedirectUrl(tokenRecord.destinationUrl)
    ) {
      throw new Error('Invalid or expired tracking link');
    }

    // Check if click tracking is enabled for this campaign
    if (tokenRecord.campaignRecipient.campaign.trackingClickEnabled) {
      await prisma.trackingEvent.create({
        data: {
          campaignRecipientId: tokenRecord.campaignRecipientId,
          eventType: 'click',
          limitedMetadata: {
            destination: tokenRecord.destinationUrl,
            client: metadata?.userAgent ? 'Browser' : 'Unknown',
          },
        },
      });

      logger.info('Tracked link click recorded', {
        recipientId: tokenRecord.campaignRecipientId,
        destination: tokenRecord.destinationUrl,
      });
    }

    return tokenRecord.destinationUrl;
  }
}
