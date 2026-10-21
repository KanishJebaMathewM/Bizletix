import { Router, Request, Response } from 'express';
import { SuppressionService } from '../services/suppression.service.js';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../config/crypto.js';

const router = Router();

// Public unsubscribe landing page info
router.get('/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ success: false, message: 'Invalid token' });
    return;
  }

  try {
    const tokenRecord = await prisma.trackingToken.findFirst({
      where: {
        OR: [
          { tokenHash: hashToken(token) },
          { tokenHash: token },
        ],
      },
      include: {
        campaignRecipient: {
          include: { campaign: true },
        },
      },
    });

    if (!tokenRecord || tokenRecord.tokenType !== 'unsubscribe') {
      res.status(404).json({ success: false, message: 'Invalid or expired unsubscribe link' });
      return;
    }

    res.json({
      success: true,
      data: {
        email: tokenRecord.campaignRecipient.recipientEmail,
        campaignName: tokenRecord.campaignRecipient.campaign.name,
      },
    });
  } catch {
    res.status(404).json({ success: false, message: 'Invalid or expired unsubscribe link' });
  }
});

// Process public unsubscribe confirmation
router.post('/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  const reason = req.body?.reason;

  try {
    const result = await SuppressionService.processUnsubscribeByToken(token, reason);
    res.json({
      success: true,
      message: 'You have been successfully unsubscribed. You will not receive any further campaign emails.',
      data: result,
    });
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: { code: 'UNSUBSCRIBE_FAILED', message: err instanceof Error ? err.message : 'Failed to process unsubscribe' },
    });
  }
});

export default router;
