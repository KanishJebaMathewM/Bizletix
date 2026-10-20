import { z } from 'zod';
import { isValidEmail } from './utils.js';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .refine(isValidEmail, { message: 'Invalid email address format' });

export const createContactSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().max(200).optional().nullable(),
  customFields: z.record(z.string(), z.string()).optional().default({}),
  listIds: z.array(z.string().uuid()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const csvPreviewRequestSchema = z.object({
  csvContent: z.string().min(1, 'CSV content cannot be empty'),
  hasHeader: z.boolean().default(true),
});

export const columnMappingSchema = z.object({
  email: z.string().min(1, 'Email column mapping is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  github_username: z.string().optional(),
  customFieldColumns: z.record(z.string(), z.string()).optional(),
});

export const csvImportExecuteSchema = z.object({
  csvContent: z.string().min(1, 'CSV content cannot be empty'),
  mapping: columnMappingSchema,
  targetListId: z.string().uuid().optional().nullable(),
  skipDuplicates: z.boolean().default(true),
});

export const createContactListSchema = z.object({
  name: z.string().trim().min(1, 'List name is required').max(150),
  description: z.string().trim().max(500).optional().nullable(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(150),
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  htmlBody: z.string().min(1, 'HTML body is required'),
  textBody: z.string().optional().nullable(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(150),
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  templateId: z.string().uuid().optional().nullable(),
  htmlBody: z.string().min(1, 'Email content is required'),
  textBody: z.string().optional().nullable(),
  senderConnectionId: z.string().uuid().optional().nullable(),
  contactListIds: z.array(z.string().uuid()).min(1, 'At least one recipient list must be selected'),
  trackingOpenEnabled: z.boolean().default(true),
  trackingClickEnabled: z.boolean().default(true),
  includeUnsubscribe: z.boolean().default(true),
  scheduledAt: z.string().datetime().optional().nullable(),
  replyTo: emailSchema.optional().nullable(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const launchCampaignSchema = z.object({
  idempotencyKey: z.string().uuid(),
});

export const testSendSchema = z.object({
  recipientEmail: emailSchema,
  senderConnectionId: z.string().uuid().optional().nullable(),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional().nullable(),
  testContactData: z.record(z.string(), z.string()).optional(),
});

export const manualSuppressionSchema = z.object({
  email: emailSchema,
  reason: z.enum(['unsubscribed', 'bounced', 'complaint', 'manual']).default('manual'),
});

export const unsubscribeRequestSchema = z.object({
  confirm: z.boolean().default(true),
  reason: z.string().max(250).optional(),
});

export const privacySettingsSchema = z.object({
  retentionDays: z.number().int().min(7).max(3650).default(365),
  globalOpenTrackingDefault: z.boolean().default(true),
  globalClickTrackingDefault: z.boolean().default(true),
});
