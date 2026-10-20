import { prisma } from '../lib/prisma.js';
import {
  renderMergeText,
  extractMergeVariables,
  escapeCsvCell,
  normalizeEmail,
} from '@bizletix/shared';
import { TrackingService } from './tracking.service.js';
import { SuppressionService } from './suppression.service.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { stringify } from 'csv-stringify/sync';
import { campaignQueue } from '../queue/campaign.queue.js';

export class CampaignsService {
  /**
   * Create campaign draft
   */
  static async createCampaign(
    ownerId: string,
    data: {
      name: string;
      subject: string;
      templateId?: string | null;
      htmlBody: string;
      textBody?: string | null;
      senderConnectionId?: string | null;
      contactListIds: string[];
      trackingOpenEnabled?: boolean;
      trackingClickEnabled?: boolean;
      includeUnsubscribe?: boolean;
      scheduledAt?: string | null;
      replyTo?: string | null;
    }
  ) {
    const campaign = await prisma.campaign.create({
      data: {
        ownerId,
        name: data.name.trim(),
        subject: data.subject.trim(),
        templateId: data.templateId || null,
        htmlBody: data.htmlBody,
        textBody: data.textBody || null,
        senderConnectionId: data.senderConnectionId || null,
        trackingOpenEnabled: data.trackingOpenEnabled ?? true,
        trackingClickEnabled: data.trackingClickEnabled ?? true,
        includeUnsubscribe: data.includeUnsubscribe ?? true,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        replyTo: data.replyTo || null,
        status: 'draft',
      },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'campaign_created',
        resourceType: 'campaign',
        resourceId: campaign.id,
      },
    });

    return campaign;
  }

  /**
   * Preview personalization for given campaign content and sample recipients
   */
  static async previewPersonalization(
    ownerId: string,
    options: {
      subject: string;
      htmlBody: string;
      textBody?: string | null;
      sampleContactIds?: string[];
      listId?: string;
    }
  ) {
    const { subject, htmlBody, textBody, sampleContactIds, listId } = options;

    let contacts = [];
    if (sampleContactIds && sampleContactIds.length > 0) {
      contacts = await prisma.contact.findMany({
        where: { id: { in: sampleContactIds }, ownerId },
        take: 5,
      });
    } else if (listId) {
      contacts = await prisma.contact.findMany({
        where: {
          ownerId,
          memberships: { some: { contactListId: listId } },
        },
        take: 5,
      });
    } else {
      contacts = await prisma.contact.findMany({
        where: { ownerId },
        take: 3,
      });
    }

    const requiredVars = Array.from(
      new Set([...extractMergeVariables(subject), ...extractMergeVariables(htmlBody)])
    );

    const previews = contacts.map((c) => {
      const custom = (c.customFields as Record<string, string>) || {};
      const mergeData = {
        email: c.email,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        first_name: c.firstName,
        last_name: c.lastName,
        ...custom,
      };

      const resolvedSubject = renderMergeText(subject, mergeData, { escapeForHtml: false });
      const resolvedHtml = renderMergeText(htmlBody, mergeData, { escapeForHtml: false });
      const resolvedText = textBody ? renderMergeText(textBody, mergeData, { escapeForHtml: false }) : null;

      const missingVariables = requiredVars.filter((v) => {
        const val = mergeData[v as keyof typeof mergeData];
        return val === undefined || val === null || val === '';
      });

      return {
        contactId: c.id,
        recipientEmail: c.email,
        recipientName: c.name,
        resolvedSubject,
        resolvedHtml,
        resolvedText,
        missingVariables,
      };
    });

    return {
      requiredVariables: requiredVars,
      previews,
    };
  }

  /**
   * Launch campaign idempotently:
   * Resolves list members, filters suppressions, creates recipient records with tokens, queues background job.
   */
  static async launchCampaign(ownerId: string, campaignId: string, idempotencyKey: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
      include: {
        senderConnection: true,
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error(`Campaign cannot be launched from current status: ${campaign.status}`);
    }

    // Check idempotency key
    if (campaign.idempotencyKey && campaign.idempotencyKey === idempotencyKey) {
      logger.info('Duplicate launch ignored (idempotent)', { campaignId, idempotencyKey });
      return campaign;
    }

    // Ensure sender is connected if not running in mock mode
    if (!campaign.senderConnectionId && !env.ENABLE_MOCK_SENDER && process.env.NODE_ENV !== 'test') {
      throw new Error('Please select an authorized Gmail connection before launching the campaign');
    }

    // Load suppressed emails for user
    const suppressedSet = await SuppressionService.getSuppressedSet(ownerId);

    // Find all contacts in any list or directly associated
    const contacts = await prisma.contact.findMany({
      where: { ownerId },
      include: { memberships: true },
    });

    // Filter contacts that are eligible
    const eligibleContacts = contacts.filter((c) => {
      const email = normalizeEmail(c.email);
      return !suppressedSet.has(email);
    });

    if (eligibleContacts.length === 0) {
      throw new Error('No eligible recipients found. All contacts are either suppressed, invalid, or lists are empty.');
    }

    // Atomically update campaign state and create recipients
    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'queued',
          idempotencyKey,
          startedAt: new Date(),
        },
      });

      // Prepare recipient records
      for (const c of eligibleContacts) {
        const custom = (c.customFields as Record<string, string>) || {};
        const mergeData = {
          email: c.email,
          name: c.name,
          firstName: c.firstName,
          lastName: c.lastName,
          ...custom,
        };

        const renderedSubject = renderMergeText(campaign.subject, mergeData, { escapeForHtml: false });

        // Upsert recipient
        const recipient = await tx.campaignRecipient.upsert({
          where: {
            campaignId_recipientEmail: {
              campaignId,
              recipientEmail: c.email,
            },
          },
          update: {
            renderedSubject,
            status: 'queued',
          },
          create: {
            campaignId,
            contactId: c.id,
            recipientEmail: c.email,
            renderedSubject,
            status: 'queued',
          },
        });

        // Open tracking token
        if (campaign.trackingOpenEnabled) {
          await TrackingService.createOpenToken(recipient.id);
        }

        // Unsubscribe token
        if (campaign.includeUnsubscribe) {
          await TrackingService.createUnsubscribeToken(recipient.id);
        }
      }
    });

    // Enqueue campaign job into background queue
    await campaignQueue.enqueueCampaign(campaignId);

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'campaign_launched',
        resourceType: 'campaign',
        resourceId: campaignId,
        limitedMetadata: { recipientCount: eligibleContacts.length },
      },
    });

    logger.info('Campaign launched successfully', {
      campaignId,
      eligibleRecipients: eligibleContacts.length,
    });

    return prisma.campaign.findUnique({ where: { id: campaignId } });
  }

  /**
   * Pause campaign
   */
  static async pauseCampaign(ownerId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
    });

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'sending' && campaign.status !== 'queued') {
      throw new Error(`Cannot pause campaign with status: ${campaign.status}`);
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'paused' },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'campaign_paused',
        resourceType: 'campaign',
        resourceId: campaignId,
      },
    });

    return updated;
  }

  /**
   * Resume campaign
   */
  static async resumeCampaign(ownerId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
    });

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'paused') {
      throw new Error(`Cannot resume campaign that is not paused`);
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'queued' },
    });

    await campaignQueue.enqueueCampaign(campaignId);

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'campaign_resumed',
        resourceType: 'campaign',
        resourceId: campaignId,
      },
    });

    return updated;
  }

  /**
   * Cancel campaign
   */
  static async cancelCampaign(ownerId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
    });

    if (!campaign) throw new Error('Campaign not found');

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'campaign_cancelled',
        resourceType: 'campaign',
        resourceId: campaignId,
      },
    });

    return updated;
  }

  /**
   * List campaigns with summary counts
   */
  static async listCampaigns(ownerId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { ownerId },
      include: {
        recipients: {
          select: {
            status: true,
            trackingEvents: { select: { eventType: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => {
      let sentCount = 0;
      let failureCount = 0;
      let openCount = 0;
      let uniqueOpenCount = 0;
      let clickCount = 0;
      let uniqueClickCount = 0;

      c.recipients.forEach((r) => {
        if (r.status === 'accepted_by_provider') sentCount++;
        if (r.status === 'send_failed') failureCount++;

        let hasOpen = false;
        let hasClick = false;

        r.trackingEvents.forEach((ev) => {
          if (ev.eventType === 'open') {
            openCount++;
            hasOpen = true;
          }
          if (ev.eventType === 'click') {
            clickCount++;
            hasClick = true;
          }
        });

        if (hasOpen) uniqueOpenCount++;
        if (hasClick) uniqueClickCount++;
      });

      return {
        id: c.id,
        ownerId: c.ownerId,
        name: c.name,
        status: c.status,
        subject: c.subject,
        totalRecipients: c.recipients.length,
        sentCount,
        failureCount,
        openCount,
        uniqueOpenCount,
        clickCount,
        uniqueClickCount,
        scheduledAt: c.scheduledAt?.toISOString() || null,
        startedAt: c.startedAt?.toISOString() || null,
        completedAt: c.completedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Get single campaign details
   */
  static async getCampaign(ownerId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
      include: {
        senderConnection: {
          select: { id: true, email: true, connectionStatus: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
    });

    if (!campaign) return null;

    return {
      ...campaign,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      scheduledAt: campaign.scheduledAt?.toISOString() || null,
      startedAt: campaign.startedAt?.toISOString() || null,
      completedAt: campaign.completedAt?.toISOString() || null,
    };
  }

  /**
   * Export campaign recipients & outcome report to CSV
   */
  static async exportCampaignReportToCsv(ownerId: string, campaignId: string): Promise<string> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
    });
    if (!campaign) throw new Error('Campaign not found');

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId },
      include: {
        trackingEvents: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows = recipients.map((r) => {
      const opens = r.trackingEvents.filter((e) => e.eventType === 'open');
      const clicks = r.trackingEvents.filter((e) => e.eventType === 'click');
      const unsubs = r.trackingEvents.filter((e) => e.eventType === 'unsubscribe');

      return {
        recipientEmail: escapeCsvCell(r.recipientEmail),
        renderedSubject: escapeCsvCell(r.renderedSubject),
        status: escapeCsvCell(r.status),
        providerMessageId: escapeCsvCell(r.providerMessageId || ''),
        acceptedAt: r.acceptedAt?.toISOString() || '',
        failedAt: r.failedAt?.toISOString() || '',
        failureReason: escapeCsvCell(r.failureMessage || ''),
        detectedOpenEvents: opens.length,
        firstOpenedAt: opens[0]?.occurredAt.toISOString() || '',
        trackedClickEvents: clicks.length,
        firstClickedAt: clicks[0]?.occurredAt.toISOString() || '',
        unsubscribed: unsubs.length > 0 ? 'Yes' : 'No',
      };
    });

    return stringify(rows, { header: true });
  }
}
