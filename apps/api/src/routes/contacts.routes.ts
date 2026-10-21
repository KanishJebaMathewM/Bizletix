import { Router, Request, Response } from 'express';
import { ContactsService } from '../services/contacts.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  csvPreviewRequestSchema,
  csvImportExecuteSchema,
  createContactSchema,
  createContactListSchema,
  updateContactSchema,
} from '@bizletix/shared';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Preview uploaded CSV
router.post('/import/preview', requireAuth, (req: Request, res: Response) => {
  const { csvContent } = csvPreviewRequestSchema.parse(req.body);
  const preview = ContactsService.previewCsv(csvContent);
  res.json({
    success: true,
    data: preview,
  });
});

// Execute CSV import
router.post('/import', requireAuth, async (req: Request, res: Response) => {
  const { csvContent, mapping, targetListId, skipDuplicates } = csvImportExecuteSchema.parse(req.body);
  const result = await ContactsService.importCsv(req.user!.id, csvContent, mapping, {
    targetListId: targetListId || null,
    skipDuplicates,
  });
  res.json({
    success: true,
    data: result,
  });
});

// Export contacts to CSV
router.get('/export', requireAuth, async (req: Request, res: Response) => {
  const listId = req.query.listId as string | undefined;
  const csv = await ContactsService.exportContactsToCsv(req.user!.id, listId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Bizletix-contacts.csv"');
  res.send(csv);
});

// List paginated contacts
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const search = req.query.search as string | undefined;
  const listId = req.query.listId as string | undefined;

  const data = await ContactsService.getContacts(req.user!.id, {
    page,
    limit,
    search,
    listId,
  });

  res.json({
    success: true,
    data,
  });
});

// Create single contact manually
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = createContactSchema.parse(req.body);
  const contact = await prisma.contact.create({
    data: {
      ownerId: req.user!.id,
      email: body.email,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      name: body.name || (body.firstName ? `${body.firstName} ${body.lastName || ''}`.trim() : null),
      customFields: (body.customFields || {}) as any,
    },
  });

  if (body.listIds && body.listIds.length > 0) {
    await prisma.contactListMember.createMany({
      data: body.listIds.map((lId) => ({
        contactListId: lId,
        contactId: contact.id,
      })),
      skipDuplicates: true,
    });
  }

  res.status(201).json({
    success: true,
    data: { contact },
  });
});

// Update contact details and replace its list memberships
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const body = updateContactSchema.parse(req.body);
  const existing = await prisma.contact.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!existing) {
    res.status(404).json({
      success: false,
      error: { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' },
    });
    return;
  }

  if (body.listIds) {
    const ownedLists = await prisma.contactList.count({
      where: { ownerId: req.user!.id, id: { in: body.listIds } },
    });
    if (ownedLists !== body.listIds.length) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CONTACT_LIST', message: 'One or more selected lists are invalid' },
      });
      return;
    }
  }

  const contact = await prisma.$transaction(async (tx) => {
    const updated = await tx.contact.update({
      where: { id: existing.id },
      data: {
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.firstName !== undefined ? { firstName: body.firstName || null } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName || null } : {}),
        ...(body.name !== undefined ? { name: body.name || null } : {}),
        ...(body.customFields !== undefined ? { customFields: body.customFields } : {}),
      },
    });

    if (body.listIds) {
      await tx.contactListMember.deleteMany({ where: { contactId: existing.id } });
      if (body.listIds.length > 0) {
        await tx.contactListMember.createMany({
          data: body.listIds.map((contactListId) => ({
            contactListId,
            contactId: existing.id,
          })),
        });
      }
    }

    return updated;
  });

  res.json({ success: true, data: { contact } });
});

// Delete contact
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  await ContactsService.deleteContact(req.user!.id, req.params.id);
  res.json({
    success: true,
    message: 'Contact deleted successfully',
  });
});

// Contact lists
router.get('/lists/all', requireAuth, async (req: Request, res: Response) => {
  const lists = await ContactsService.getContactLists(req.user!.id);
  res.json({
    success: true,
    data: { lists },
  });
});

router.post('/lists', requireAuth, async (req: Request, res: Response) => {
  const { name, description } = createContactListSchema.parse(req.body);
  const list = await ContactsService.createContactList(req.user!.id, name, description);
  res.status(201).json({
    success: true,
    data: { list },
  });
});

export default router;
