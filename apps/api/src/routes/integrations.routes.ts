import { Router, Request, Response } from 'express';
import { GoogleService } from '../services/google.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Get Google Gmail connection status
router.get('/google/status', requireAuth, async (req: Request, res: Response) => {
  const status = await GoogleService.getConnectionStatus(req.user!.id);
  res.json({
    success: true,
    data: {
      connection: status,
    },
  });
});

// Start connecting Google account from settings
router.get('/google/connect', requireAuth, (req: Request, res: Response) => {
  const { url } = GoogleService.generateAuthUrl(req.user!.id);
  res.json({
    success: true,
    data: { authUrl: url },
  });
});

// Disconnect Google account and revoke token
router.post('/google/disconnect', requireAuth, async (req: Request, res: Response) => {
  await GoogleService.disconnect(req.user!.id);
  res.json({
    success: true,
    message: 'Gmail connection successfully disconnected and credentials revoked',
  });
});

export default router;
