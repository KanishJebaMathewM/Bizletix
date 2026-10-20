import { prisma } from '../lib/prisma.js';
import { normalizeEmail, escapeCsvCell } from '@bizletix/shared';
import { hashToken } from '../config/crypto.js';
import { logger } from '../lib/logger.js';
import { stringify } from 'csv-stringify/sync';

export class SuppressionService {
  /**
   * Check if an email is suppressed for an owner
   */
  static async isSuppressed(ownerId: string, email: string): Promise<boolean> {
    const normalized = normalizeEmail(email);
    const existing = await prisma.suppression.findFirst({
      where: { ownerId, emailNormalized: normalized },
    });
    return !!existing;
  }

  /**
   * Get all suppressed emails for an owner as a set
   */
  static async getSuppressedSet(ownerId: string): Promise<Set<string>> {
    const records = await prisma.suppression.findMany({
      where: { ownerId },
      select: { emailNormalized: true },
    });
    return new Set(records.map((r) => r.emailNormalized));
  }

  /**
   * Manually suppress an email
   */
  static async addSuppression(
    ownerId: string,
    email: string,
    reason: 'manual' | 'unsubscribed' | 'bounced' | 'complaint' = 'manual',
    source: 'admin_manual' | 'recipient_action' | 'provider_feedback' = 'admin_manual'
  ) {
    const normalized = normalizeEmail(email);

    const record = await prisma.suppression.upsert({
      where: {
        ownerId_emailNormalized: {
          ownerId,
          emailNormalized: normalized,
        },
      },
      update: {
        reason,
        source,
      },
      create: {
        ownerId,
        emailNormalized: normalized,
        reason,
        source,
      },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'suppression_added',
        resourceType: 'suppression',
        resourceId: record.id,
        limitedMetadata: { emailNormalized: normalized, reason, source },
      },
    });

    logger.info('Email added to suppression list', { ownerId, email: normalized, reason });
    return record;
  }

  /**
   * Remove suppression
   */
  static async removeSuppression(ownerId: string, suppressionId: string) {
    const record = await prisma.suppression.findFirst({
      where: { id: suppressionId, ownerId },
    });

    if (!record) {
      throw new Error('Suppression record not found');
    }

    await prisma.suppression.delete({
      where: { id: suppressionId },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'suppression_removed',
        resourceType: 'suppression',
        resourceId: suppressionId,
        limitedMetadata: { emailNormalized: record.emailNormalized },
      },
    });

    logger.info('Email removed from suppression list', { ownerId, email: record.emailNormalized });
  }

  /**
   * Process unsubscribe request via token
   */
  static async processUnsubscribeByToken(rawToken: string, reasonDetails?: string) {
    const tokenHash = hashToken(rawToken);

    const tokenRecord = await prisma.trackingToken.findUnique({
      where: { tokenHash },
      include: {
        campaignRecipient: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.tokenType !== 'unsubscribe') {
      throw new Error('Invalid or expired unsubscribe link');
    }

    const { campaignRecipient } = tokenRecord;
    const { campaign } = campaignRecipient;
    const recipientEmail = campaignRecipient.recipientEmail;

    // Add to owner's suppression table
    await this.addSuppression(
      campaign.ownerId,
      recipientEmail,
      'unsubscribed',
      'recipient_action'
    );

    // Record tracking event
    await prisma.trackingEvent.create({
      data: {
        campaignRecipientId: campaignRecipient.id,
        eventType: 'unsubscribe',
        deduplicationKey: `unsub_${campaignRecipient.id}`,
        limitedMetadata: reasonDetails ? { reason: reasonDetails.slice(0, 250) } : {},
      },
    });

    logger.info('Recipient unsubscribed via token', {
      campaignId: campaign.id,
      recipientId: campaignRecipient.id,
    });

    return {
      success: true,
      email: recipientEmail,
      campaignName: campaign.name,
    };
  }

  /**
   * List suppressions
   */
  static async listSuppressions(ownerId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      prisma.suppression.count({ where: { ownerId } }),
      prisma.suppression.findMany({
        where: { ownerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        email: s.emailNormalized,
        reason: s.reason,
        source: s.source,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Export suppressions to CSV
   */
  static async exportToCsv(ownerId: string): Promise<string> {
    const items = await prisma.suppression.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });

    const rows = items.map((item) => ({
      email: escapeCsvCell(item.emailNormalized),
      reason: escapeCsvCell(item.reason),
      source: escapeCsvCell(item.source),
      createdAt: item.createdAt.toISOString(),
    }));

    return stringify(rows, { header: true });
  }
}
