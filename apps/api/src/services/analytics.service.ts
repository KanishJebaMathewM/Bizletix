import { prisma } from '../lib/prisma.js';
import type { CampaignAnalyticsSummary } from '@bizletix/shared';

export class AnalyticsService {
  /**
   * Get accurate analytics summary for a campaign based exclusively on persisted DB records
   */
  static async getCampaignAnalytics(ownerId: string, campaignId: string): Promise<CampaignAnalyticsSummary> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
      include: {
        recipients: {
          include: {
            trackingEvents: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    let queuedCount = 0;
    let sendingCount = 0;
    let acceptedByProviderCount = 0;
    let sendFailedCount = 0;
    let deliveryUnknownCount = 0;
    let deliveryConfirmedCount = 0;
    let detectedOpenEvents = 0;
    let uniqueDetectedOpens = 0;
    let trackedClickEvents = 0;
    let uniqueTrackedClicks = 0;
    let unsubscribeCount = 0;
    let bounceCount = 0;

    for (const r of campaign.recipients) {
      if (r.status === 'queued') queuedCount++;
      else if (r.status === 'sending') sendingCount++;
      else if (r.status === 'accepted_by_provider') acceptedByProviderCount++;
      else if (r.status === 'send_failed') sendFailedCount++;
      else if (r.status === 'delivery_unknown') deliveryUnknownCount++;
      else if (r.status === 'delivery_confirmed') deliveryConfirmedCount++;
      else if (r.status === 'bounced') bounceCount++;

      let hasOpen = false;
      let hasClick = false;
      let hasUnsub = false;
      let hasBounce = false;

      for (const ev of r.trackingEvents) {
        if (ev.eventType === 'open') {
          detectedOpenEvents++;
          hasOpen = true;
        } else if (ev.eventType === 'click') {
          trackedClickEvents++;
          hasClick = true;
        } else if (ev.eventType === 'unsubscribe') {
          hasUnsub = true;
        } else if (ev.eventType === 'bounce') {
          hasBounce = true;
        }
      }

      if (hasOpen) uniqueDetectedOpens++;
      if (hasClick) uniqueTrackedClicks++;
      if (hasUnsub) unsubscribeCount++;
      if (hasBounce) bounceCount++;
    }

    const totalRecipients = campaign.recipients.length;

    // Denominator for rates is recipients accepted by provider (or total if none accepted yet)
    const baseAccepted = acceptedByProviderCount > 0 ? acceptedByProviderCount : 0;
    const detectedOpenRatePct = baseAccepted > 0 ? Math.round((uniqueDetectedOpens / baseAccepted) * 1000) / 10 : 0;
    const trackedClickRatePct = baseAccepted > 0 ? Math.round((uniqueTrackedClicks / baseAccepted) * 1000) / 10 : 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status as any,
      totalRecipients,
      queuedCount,
      sendingCount,
      acceptedByProviderCount,
      sendFailedCount,
      deliveryUnknownCount,
      deliveryConfirmedCount,
      detectedOpenEvents,
      uniqueDetectedOpens,
      detectedOpenRatePct,
      trackedClickEvents,
      uniqueTrackedClicks,
      trackedClickRatePct,
      unsubscribeCount,
      bounceCount,
      startedAt: campaign.startedAt?.toISOString() || null,
      completedAt: campaign.completedAt?.toISOString() || null,
    };
  }

  /**
   * Get paginated recipients for campaign with event timestamps and status
   */
  static async getCampaignRecipients(
    ownerId: string,
    campaignId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, status, search } = options;
    const skip = (page - 1) * limit;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
    });
    if (!campaign) throw new Error('Campaign not found');

    const where: any = {
      campaignId,
      ...(status ? { status } : {}),
      ...(search ? { recipientEmail: { contains: search } } : {}),
    };

    const [total, recipients] = await Promise.all([
      prisma.campaignRecipient.count({ where }),
      prisma.campaignRecipient.findMany({
        where,
        skip,
        take: limit,
        include: {
          trackingEvents: {
            orderBy: { occurredAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items = recipients.map((r) => {
      const opens = r.trackingEvents.filter((e) => e.eventType === 'open');
      const clicks = r.trackingEvents.filter((e) => e.eventType === 'click');
      const unsubs = r.trackingEvents.filter((e) => e.eventType === 'unsubscribe');

      return {
        id: r.id,
        campaignId: r.campaignId,
        contactId: r.contactId,
        recipientEmail: r.recipientEmail,
        renderedSubject: r.renderedSubject,
        status: r.status,
        providerMessageId: r.providerMessageId,
        queuedAt: r.queuedAt?.toISOString() || null,
        acceptedAt: r.acceptedAt?.toISOString() || null,
        failedAt: r.failedAt?.toISOString() || null,
        failureCode: r.failureCode,
        failureMessage: r.failureMessage,
        openCount: opens.length,
        firstOpenedAt: opens[opens.length - 1]?.occurredAt.toISOString() || null,
        lastOpenedAt: opens[0]?.occurredAt.toISOString() || null,
        clickCount: clicks.length,
        firstClickedAt: clicks[clicks.length - 1]?.occurredAt.toISOString() || null,
        lastClickedAt: clicks[0]?.occurredAt.toISOString() || null,
        unsubscribedAt: unsubs[0]?.occurredAt.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return {
      recipients: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get high-level dashboard metrics for all campaigns owned by user
   */
  static async getDashboardOverview(ownerId: string) {
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

    let totalRecipientsProcessed = 0;
    let totalAcceptedByProvider = 0;
    let totalFailedSends = 0;
    let totalDetectedOpens = 0;
    let totalUniqueDetectedOpens = 0;
    let totalTrackedClicks = 0;
    let totalUniqueTrackedClicks = 0;
    let totalUnsubscribes = 0;

    for (const c of campaigns) {
      for (const r of c.recipients) {
        totalRecipientsProcessed++;
        if (r.status === 'accepted_by_provider') totalAcceptedByProvider++;
        if (r.status === 'send_failed') totalFailedSends++;

        let hasOpen = false;
        let hasClick = false;
        for (const ev of r.trackingEvents) {
          if (ev.eventType === 'open') {
            totalDetectedOpens++;
            hasOpen = true;
          }
          if (ev.eventType === 'click') {
            totalTrackedClicks++;
            hasClick = true;
          }
          if (ev.eventType === 'unsubscribe') {
            totalUnsubscribes++;
          }
        }
        if (hasOpen) totalUniqueDetectedOpens++;
        if (hasClick) totalUniqueTrackedClicks++;
      }
    }

    const recentEvents = await prisma.trackingEvent.findMany({
      where: {
        campaignRecipient: {
          campaign: { ownerId },
        },
      },
      include: {
        campaignRecipient: {
          select: {
            recipientEmail: true,
            campaign: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    });

    return {
      totalCampaigns: campaigns.length,
      totalRecipientsProcessed,
      totalAcceptedByProvider,
      totalFailedSends,
      totalDetectedOpens,
      totalUniqueDetectedOpens,
      totalTrackedClicks,
      totalUnsubscribes,
      recentCampaigns: campaigns.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        subject: c.subject,
        recipientCount: c.recipients.length,
        createdAt: c.createdAt.toISOString(),
      })),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        recipientEmail: e.campaignRecipient.recipientEmail,
        campaignId: e.campaignRecipient.campaign.id,
        campaignName: e.campaignRecipient.campaign.name,
        occurredAt: e.occurredAt.toISOString(),
        metadata: e.limitedMetadata,
      })),
    };
  }
}
