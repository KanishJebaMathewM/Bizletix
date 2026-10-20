import { Router, Request, Response } from 'express';
import { CampaignsService } from '../services/campaigns.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { EmailSenderService } from '../services/email-sender.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createCampaignSchema,
  launchCampaignSchema,
  testSendSchema,
  renderMergeText,
} from '@bizletix/shared';

const router = Router();

// List all campaigns
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const campaigns = await CampaignsService.listCampaigns(req.user!.id);
  res.json({
    success: true,
    data: { campaigns },
  });
});

// Create draft campaign
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = createCampaignSchema.parse(req.body);
  const campaign = await CampaignsService.createCampaign(req.user!.id, body);
  res.status(201).json({
    success: true,
    data: { campaign },
  });
});

// Preview personalization
router.post('/preview', requireAuth, async (req: Request, res: Response) => {
  const { subject, htmlBody, textBody, sampleContactIds, listId } = req.body;
  if (!subject || !htmlBody) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Subject and HTML content are required for preview' },
    });
    return;
  }

  const result = await CampaignsService.previewPersonalization(req.user!.id, {
    subject,
    htmlBody,
    textBody,
    sampleContactIds,
    listId,
  });

  res.json({
    success: true,
    data: result,
  });
});

// Send test email
router.post('/:id/test', requireAuth, async (req: Request, res: Response) => {
  const body = testSendSchema.parse(req.body);

  const testMergeData = {
    email: body.recipientEmail,
    name: 'Sample Recipient',
    firstName: 'Sample',
    lastName: 'Recipient',
    first_name: 'Sample',
    last_name: 'Recipient',
    company: 'Acme Corp',
    github_username: 'octocat',
    ...(body.testContactData || {}),
  };

  const resolvedSubject = `[TEST] ${renderMergeText(body.subject, testMergeData)}`;
  const resolvedHtml = renderMergeText(body.htmlBody, testMergeData);
  const resolvedText = body.textBody ? renderMergeText(body.textBody, testMergeData) : null;

  const result = await EmailSenderService.send({
    senderConnectionId: body.senderConnectionId || null,
    toEmail: body.recipientEmail,
    subject: resolvedSubject,
    htmlBody: resolvedHtml,
    textBody: resolvedText,
  });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: result.failureCode || 'TEST_SEND_FAILED',
        message: result.failureMessage || 'Failed to send test email',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      providerMessageId: result.providerMessageId,
      message: 'Test email successfully dispatched',
    },
  });
});

// Launch campaign
router.post('/:id/launch', requireAuth, async (req: Request, res: Response) => {
  const { idempotencyKey } = launchCampaignSchema.parse(req.body);
  const campaign = await CampaignsService.launchCampaign(req.user!.id, req.params.id, idempotencyKey);
  res.json({
    success: true,
    data: { campaign },
  });
});

// Pause campaign
router.post('/:id/pause', requireAuth, async (req: Request, res: Response) => {
  const campaign = await CampaignsService.pauseCampaign(req.user!.id, req.params.id);
  res.json({
    success: true,
    data: { campaign },
  });
});

// Resume campaign
router.post('/:id/resume', requireAuth, async (req: Request, res: Response) => {
  const campaign = await CampaignsService.resumeCampaign(req.user!.id, req.params.id);
  res.json({
    success: true,
    data: { campaign },
  });
});

// Cancel campaign
router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const campaign = await CampaignsService.cancelCampaign(req.user!.id, req.params.id);
  res.json({
    success: true,
    data: { campaign },
  });
});

// Single campaign details
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const campaign = await CampaignsService.getCampaign(req.user!.id, req.params.id);
  if (!campaign) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Campaign not found' },
    });
    return;
  }
  res.json({
    success: true,
    data: { campaign },
  });
});

// Campaign analytics
router.get('/:id/analytics', requireAuth, async (req: Request, res: Response) => {
  const analytics = await AnalyticsService.getCampaignAnalytics(req.user!.id, req.params.id);
  res.json({
    success: true,
    data: { analytics },
  });
});

// Campaign recipients list
router.get('/:id/recipients', requireAuth, async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const data = await AnalyticsService.getCampaignRecipients(req.user!.id, req.params.id, {
    page,
    limit,
    status,
    search,
  });

  res.json({
    success: true,
    data,
  });
});

// Export campaign report to CSV
router.get('/:id/export', requireAuth, async (req: Request, res: Response) => {
  const csv = await CampaignsService.exportCampaignReportToCsv(req.user!.id, req.params.id);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="campaign-${req.params.id}-report.csv"`);
  res.send(csv);
});

export default router;
