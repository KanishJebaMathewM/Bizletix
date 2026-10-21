import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { prisma } from '../lib/prisma.js';
import {
  normalizeEmail,
  isValidEmail,
  escapeCsvCell,
  type CSVImportResult,
  type CSVPreviewRow,
} from '@bizletix/shared';
import { logger } from '../lib/logger.js';
import { Prisma } from '@prisma/client';

export interface ColumnMapping {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  github_username?: string;
  customFieldColumns?: Record<string, string>;
}

export class ContactsService {
  /**
   * Parse CSV content and auto-suggest column mappings
   */
  static previewCsv(csvContent: string): {
    headers: string[];
    suggestedMapping: ColumnMapping;
    totalRows: number;
    previewRows: CSVPreviewRow[];
  } {
    if (!csvContent || typeof csvContent !== 'string') {
      throw new Error('CSV content cannot be empty');
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>;

    if (records.length === 0) {
      throw new Error('The uploaded CSV file is empty or contains only headers');
    }

    const headers = Object.keys(records[0] || {});
    if (headers.length === 0) {
      throw new Error('No headers found in CSV file');
    }

    // Auto-detect mappings based on header names
    const suggestedMapping: ColumnMapping = {
      email: '',
      customFieldColumns: {},
    };

    for (const h of headers) {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['email', 'emailaddress', 'mail', 'recipient', 'contactemail'].includes(lower) && !suggestedMapping.email) {
        suggestedMapping.email = h;
      } else if (['firstname', 'first', 'fname', 'givenname'].includes(lower) && !suggestedMapping.firstName) {
        suggestedMapping.firstName = h;
      } else if (['lastname', 'last', 'lname', 'surname', 'familyname'].includes(lower) && !suggestedMapping.lastName) {
        suggestedMapping.lastName = h;
      } else if (['name', 'fullname', 'contactname'].includes(lower) && !suggestedMapping.name) {
        suggestedMapping.name = h;
      } else if (['company', 'organization', 'org', 'business'].includes(lower) && !suggestedMapping.company) {
        suggestedMapping.company = h;
      } else if (['github', 'githubusername', 'gh'].includes(lower) && !suggestedMapping.github_username) {
        suggestedMapping.github_username = h;
      } else {
        if (suggestedMapping.customFieldColumns) {
          suggestedMapping.customFieldColumns[h] = h;
        }
      }
    }

    // Inspect preview rows (up to 15 rows)
    const previewRows: CSVPreviewRow[] = [];
    const sample = records.slice(0, 15);
    const emailHeader = suggestedMapping.email || headers.find((h) => h.toLowerCase().includes('mail')) || headers[0] || '';

    sample.forEach((raw, index) => {
      const rawEmail = raw[emailHeader]?.trim() || '';
      const normalized = normalizeEmail(rawEmail);
      const errors: string[] = [];

      if (!rawEmail) {
        errors.push('Missing email address');
      } else if (!isValidEmail(normalized)) {
        errors.push(`Invalid email format: "${rawEmail}"`);
      }

      previewRows.push({
        rowIndex: index + 1,
        raw,
        normalizedEmail: normalized,
        isValid: errors.length === 0,
        errors,
      });
    });

    return {
      headers,
      suggestedMapping,
      totalRows: records.length,
      previewRows,
    };
  }

  /**
   * Execute batch CSV import with validation, duplicate detection, suppression check, and list assignment
   */
  static async importCsv(
    ownerId: string,
    csvContent: string,
    mapping: ColumnMapping,
    options: { targetListId?: string | null; skipDuplicates?: boolean } = {}
  ): Promise<CSVImportResult> {
    const { targetListId } = options;

    if (!mapping.email) {
      throw new Error('Email column mapping is required');
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>;

    const result: CSVImportResult = {
      totalRows: records.length,
      validContacts: 0,
      invalidAddresses: 0,
      duplicateRecords: 0,
      suppressedAddresses: 0,
      successfullyImported: 0,
      errors: [],
    };

    // Load existing suppressions for owner
    const existingSuppressions = await prisma.suppression.findMany({
      where: { ownerId },
      select: { emailNormalized: true },
    });
    const suppressionSet = new Set(existingSuppressions.map((s) => s.emailNormalized));

    // Load existing contacts for owner
    const existingContacts = await prisma.contact.findMany({
      where: { ownerId },
      select: { id: true, email: true },
    });
    const contactMap = new Map<string, string>(); // normalized email -> contact id
    existingContacts.forEach((c) => contactMap.set(c.email, c.id));

    const seenInFile = new Set<string>();
    const contactsToCreate: Array<{
      ownerId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      name: string | null;
      customFields: Prisma.InputJsonValue;
    }> = [];

    const memberLinksToCreate: string[] = []; // contact IDs to link to list

    records.forEach((row, i) => {
      const rowNum = i + 1;
      const rawEmail = row[mapping.email]?.trim() || '';
      const email = normalizeEmail(rawEmail);

      if (!rawEmail || !isValidEmail(email)) {
        result.invalidAddresses++;
        result.errors.push({
          row: rowNum,
          email: rawEmail || undefined,
          message: rawEmail ? `Invalid email address: ${rawEmail}` : 'Empty email field',
        });
        return;
      }

      if (seenInFile.has(email)) {
        result.duplicateRecords++;
        return;
      }
      seenInFile.add(email);

      if (suppressionSet.has(email)) {
        result.suppressedAddresses++;
        return;
      }

      result.validContacts++;

      // Check if already in DB
      if (contactMap.has(email)) {
        result.duplicateRecords++;
        if (targetListId) {
          memberLinksToCreate.push(contactMap.get(email)!);
        }
        return;
      }

      // Extract standard fields
      const firstName = mapping.firstName ? row[mapping.firstName]?.trim() || null : null;
      const lastName = mapping.lastName ? row[mapping.lastName]?.trim() || null : null;
      let name = mapping.name ? row[mapping.name]?.trim() || null : null;
      if (!name && (firstName || lastName)) {
        name = `${firstName || ''} ${lastName || ''}`.trim() || null;
      }

      // Extract custom fields
      const customFields: Record<string, string> = {};
      if (mapping.company && row[mapping.company]) {
        customFields['company'] = row[mapping.company].trim();
      }
      if (mapping.github_username && row[mapping.github_username]) {
        customFields['github_username'] = row[mapping.github_username].trim();
      }
      if (mapping.customFieldColumns) {
        for (const [key, col] of Object.entries(mapping.customFieldColumns)) {
          if (row[col] !== undefined && row[col] !== '') {
            customFields[key] = row[col].trim();
          }
        }
      }

      contactsToCreate.push({
        ownerId,
        email,
        firstName,
        lastName,
        name,
        customFields: customFields as Prisma.InputJsonValue,
      });
    });

    // Execute insertions
    if (contactsToCreate.length > 0) {
      await prisma.contact.createMany({
        data: contactsToCreate,
        skipDuplicates: true,
      });

      result.successfullyImported = contactsToCreate.length;
    }

    // Link both new contacts and existing contacts selected for the target list.
    if (targetListId && (contactsToCreate.length > 0 || memberLinksToCreate.length > 0)) {
      const importedEmails = contactsToCreate.map((c) => c.email);
      const newlyCreated = importedEmails.length > 0
        ? await prisma.contact.findMany({
            where: { ownerId, email: { in: importedEmails } },
            select: { id: true },
          })
        : [];

      const allMemberIds = Array.from(
        new Set([...memberLinksToCreate, ...newlyCreated.map((c) => c.id)])
      );

      if (allMemberIds.length > 0) {
        await prisma.contactListMember.createMany({
          data: allMemberIds.map((cId) => ({
            contactListId: targetListId,
            contactId: cId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'contacts_imported',
        resourceType: 'contact',
        limitedMetadata: {
          totalRows: result.totalRows,
          imported: result.successfullyImported,
          duplicates: result.duplicateRecords,
          invalid: result.invalidAddresses,
        },
      },
    });

    logger.info('CSV contacts imported', {
      ownerId,
      imported: result.successfullyImported,
      total: result.totalRows,
    });

    return result;
  }

  /**
   * Get paginated contacts with search and suppression indicator
   */
  static async getContacts(
    ownerId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      listId?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, search, listId } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
      ownerId,
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { name: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          }
        : {}),
      ...(listId
        ? {
            memberships: {
              some: { contactListId: listId },
            },
          }
        : {}),
    };

    const [total, contacts, suppressions] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.suppression.findMany({
        where: { ownerId },
        select: { emailNormalized: true },
      }),
    ]);

    const suppressedEmails = new Set(suppressions.map((s) => s.emailNormalized));

    const records = contacts.map((c) => ({
      id: c.id,
      ownerId: c.ownerId,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      name: c.name,
      customFields: (c.customFields as Record<string, string>) || {},
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      isSuppressed: suppressedEmails.has(c.email),
    }));

    return {
      contacts: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Export contacts to CSV with formula-injection escaping
   */
  static async exportContactsToCsv(ownerId: string, listId?: string): Promise<string> {
    const contacts = await prisma.contact.findMany({
      where: {
        ownerId,
        ...(listId
          ? {
              memberships: {
                some: { contactListId: listId },
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = contacts.map((c) => {
      const custom = (c.customFields as Record<string, string>) || {};
      return {
        email: escapeCsvCell(c.email),
        name: escapeCsvCell(c.name || ''),
        firstName: escapeCsvCell(c.firstName || ''),
        lastName: escapeCsvCell(c.lastName || ''),
        company: escapeCsvCell(custom.company || ''),
        github_username: escapeCsvCell(custom.github_username || ''),
        createdAt: c.createdAt.toISOString(),
      };
    });

    return stringify(rows, { header: true });
  }

  /**
   * Delete contact and enforce owner isolation
   */
  static async deleteContact(ownerId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, ownerId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId,
        actorId: ownerId,
        action: 'contact_deleted',
        resourceType: 'contact',
        resourceId: contactId,
      },
    });
  }

  /**
   * Contact lists management
   */
  static async getContactLists(ownerId: string) {
    const lists = await prisma.contactList.findMany({
      where: { ownerId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return lists.map((l) => ({
      id: l.id,
      ownerId: l.ownerId,
      name: l.name,
      description: l.description,
      memberCount: l._count.members,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));
  }

  static async createContactList(ownerId: string, name: string, description?: string | null) {
    return prisma.contactList.create({
      data: {
        ownerId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
  }
}
