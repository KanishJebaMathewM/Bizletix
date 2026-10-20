import { Router, Request, Response } from 'express';
import { TemplatesService } from '../services/templates.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createTemplateSchema, updateTemplateSchema } from '@bizletix/shared';

const router = Router();

// List templates
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const templates = await TemplatesService.listTemplates(req.user!.id);
  res.json({
    success: true,
    data: { templates },
  });
});

// Create template
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = createTemplateSchema.parse(req.body);
  const template = await TemplatesService.createTemplate(req.user!.id, body);
  res.status(201).json({
    success: true,
    data: { template },
  });
});

// Get single template
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const template = await TemplatesService.getTemplate(req.user!.id, req.params.id);
  if (!template) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Template not found' },
    });
    return;
  }
  res.json({
    success: true,
    data: { template },
  });
});

// Update template
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const body = updateTemplateSchema.parse(req.body);
  const template = await TemplatesService.updateTemplate(req.user!.id, req.params.id, body);
  res.json({
    success: true,
    data: { template },
  });
});

// Delete template
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  await TemplatesService.deleteTemplate(req.user!.id, req.params.id);
  res.json({
    success: true,
    message: 'Template deleted successfully',
  });
});

export default router;
