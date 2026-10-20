import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Liveness probe
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Bizletix API',
    version: '1.0.0',
  });
});

// Readiness probe
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Dashboard overview
router.get('/api/dashboard/overview', requireAuth, async (req: Request, res: Response) => {
  const overview = await AnalyticsService.getDashboardOverview(req.user!.id);
  res.json({
    success: true,
    data: overview,
  });
});

// User audit events / privacy data export
router.get('/api/settings/privacy/export', requireAuth, async (req: Request, res: Response) => {
  const [contacts, campaigns, auditEvents, suppressions] = await Promise.all([
    prisma.contact.findMany({ where: { ownerId: req.user!.id } }),
    prisma.campaign.findMany({
      where: { ownerId: req.user!.id },
      include: { recipients: { include: { trackingEvents: true } } },
    }),
    prisma.auditEvent.findMany({ where: { ownerId: req.user!.id } }),
    prisma.suppression.findMany({ where: { ownerId: req.user!.id } }),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    user: req.user,
    contacts,
    campaigns,
    suppressions,
    auditEvents,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="Bizletix-user-data.json"');
  res.send(JSON.stringify(exportPayload, null, 2));
});

// Delete user account & personal data
router.delete('/api/settings/account/delete', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await prisma.user.delete({
    where: { id: userId },
  });
  res.clearCookie('Bizletix_session');
  res.json({
    success: true,
    message: 'User account and all associated data have been permanently deleted',
  });
});

export default router;
