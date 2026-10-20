import sanitizeHtml from 'sanitize-html';
import { prisma } from '../lib/prisma.js';
import { extractMergeVariables } from '@bizletix/shared';

// Strict HTML sanitizer options for email templates
export const SANITIZER_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span',
    'img', 'center', 'font'
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'align', 'valign', 'width', 'height', 'bgcolor', 'border'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'border', 'style'],
    table: ['cellpadding', 'cellspacing', 'border', 'width', 'style', 'align'],
    td: ['colspan', 'rowspan', 'width', 'height', 'valign', 'align', 'style'],
    th: ['colspan', 'rowspan', 'width', 'height', 'valign', 'align', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'], // Allow inline data images if needed
  },
  disallowedTagsMode: 'discard',
};

export class TemplatesService {
  /**
   * Sanitize HTML content safely
   */
  static sanitize(html: string): string {
    if (!html) return '';
    return sanitizeHtml(html, SANITIZER_OPTIONS);
  }

  /**
   * Derive a clean plain-text fallback from HTML
   */
  static htmlToPlainText(html: string): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Create template
   */
  static async createTemplate(
    ownerId: string,
    data: { name: string; subject: string; htmlBody: string; textBody?: string | null }
  ) {
    const sanitizedHtml = this.sanitize(data.htmlBody);
    const textBody = data.textBody?.trim() || this.htmlToPlainText(sanitizedHtml);

    const template = await prisma.emailTemplate.create({
      data: {
        ownerId,
        name: data.name.trim(),
        subject: data.subject.trim(),
        htmlBody: sanitizedHtml,
        textBody,
      },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'template_created',
        resourceType: 'template',
        resourceId: template.id,
      },
    });

    return template;
  }

  /**
   * Update template
   */
  static async updateTemplate(
    ownerId: string,
    templateId: string,
    data: { name?: string; subject?: string; htmlBody?: string; textBody?: string | null }
  ) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: templateId, ownerId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    const sanitizedHtml = data.htmlBody ? this.sanitize(data.htmlBody) : existing.htmlBody;
    const textBody =
      data.textBody !== undefined
        ? data.textBody
        : data.htmlBody
        ? this.htmlToPlainText(sanitizedHtml)
        : existing.textBody;

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        subject: data.subject ? data.subject.trim() : undefined,
        htmlBody: sanitizedHtml,
        textBody,
      },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'template_updated',
        resourceType: 'template',
        resourceId: templateId,
      },
    });

    return updated;
  }

  /**
   * Delete template
   */
  static async deleteTemplate(ownerId: string, templateId: string) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: templateId, ownerId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'template_deleted',
        resourceType: 'template',
        resourceId: templateId,
      },
    });
  }

  /**
   * List templates for user
   */
  static async listTemplates(ownerId: string) {
    const templates = await prisma.emailTemplate.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((t) => ({
      id: t.id,
      ownerId: t.ownerId,
      name: t.name,
      subject: t.subject,
      htmlBody: t.htmlBody,
      textBody: t.textBody,
      mergeVariables: Array.from(
        new Set([...extractMergeVariables(t.subject), ...extractMergeVariables(t.htmlBody)])
      ),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Get single template
   */
  static async getTemplate(ownerId: string, templateId: string) {
    const t = await prisma.emailTemplate.findFirst({
      where: { id: templateId, ownerId },
    });

    if (!t) return null;

    return {
      id: t.id,
      ownerId: t.ownerId,
      name: t.name,
      subject: t.subject,
      htmlBody: t.htmlBody,
      textBody: t.textBody,
      mergeVariables: Array.from(
        new Set([...extractMergeVariables(t.subject), ...extractMergeVariables(t.htmlBody)])
      ),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
