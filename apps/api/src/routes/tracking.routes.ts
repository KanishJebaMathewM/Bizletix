import { Router, Request, Response } from 'express';
import { TrackingService, TRANSPARENT_1X1_GIF } from '../services/tracking.service.js';
import { trackingLimiter } from '../middleware/rate-limiter.js';

const router = Router();

// Tracking pixel endpoint
// Serves 1x1 transparent GIF with anti-caching headers
router.get('/open/:token.gif', trackingLimiter, async (req: Request, res: Response) => {
  const token = req.params.token;

  // Set anti-caching headers so future opens can be detected
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (!token) {
    res.status(200).send(TRANSPARENT_1X1_GIF);
    return;
  }

  const gifBuffer = await TrackingService.recordOpenEvent(token, {
    userAgent: req.headers['user-agent'],
  });

  res.status(200).send(gifBuffer);
});

// Tracked link redirect endpoint
router.get('/click/:token', trackingLimiter, async (req: Request, res: Response) => {
  const token = req.params.token;

  if (!token) {
    res.status(400).send('Invalid tracking token');
    return;
  }

  try {
    const destinationUrl = await TrackingService.recordClickEvent(token, {
      userAgent: req.headers['user-agent'],
    });

    // 302 redirect to authorized target
    res.redirect(302, destinationUrl);
  } catch {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Link Expired or Invalid - Bizletix</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 48px;">
          <h2>Link Not Found</h2>
          <p>The link you requested is invalid, expired, or has already been removed.</p>
        </body>
      </html>
    `);
  }
});

export default router;
