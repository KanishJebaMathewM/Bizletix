import { Router, Request, Response } from 'express';
import { SuppressionService } from '../services/suppression.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { manualSuppressionSchema } from '@bizletix/shared';

const router = Router();

// List suppressions
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const data = await SuppressionService.listSuppressions(req.user!.id, page, limit);
  res.json({
    success: true,
    data,
  });
});

// Add manual suppression
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { email, reason } = manualSuppressionSchema.parse(req.body);
  const record = await SuppressionService.addSuppression(req.user!.id, email, reason, 'admin_manual');
  res.status(201).json({
    success: true,
    data: { record },
  });
});

// Remove suppression
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  await SuppressionService.removeSuppression(req.user!.id, req.params.id);
  res.json({
    success: true,
    message: 'Suppression removed successfully',
  });
});

// Export suppressions
router.get('/export', requireAuth, async (req: Request, res: Response) => {
  const csv = await SuppressionService.exportToCsv(req.user!.id);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Bizletix-suppressions.csv"');
  res.send(csv);
});

export default router;
