import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/api/src/config/crypto.js';
import { normalizeEmail } from '../packages/shared/src/utils.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Bizletix database with development sample data...');

  const demoEmail = normalizeEmail('demo@bizletix.local');
  const { hash: passwordHash } = hashPassword('demo123456');

  // Upsert demo user
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: 'Demo Admin',
      passwordHash,
    },
  });

  console.log(`👤 User ready: ${user.email} (password: demo123456)`);

  // Create sample contact lists
  const communityList = await prisma.contactList.create({
    data: {
      ownerId: user.id,
      name: 'Open Source Contributors',
      description: 'Developers who contributed to core repositories and documentation',
    },
  });

  // Create sample contacts
  const sampleContacts = [
    {
      email: 'alex@example.org',
      name: 'Alex Rivera',
      firstName: 'Alex',
      lastName: 'Rivera',
      customFields: { company: 'Acme Technologies', github_username: 'alexr' },
    },
    {
      email: 'sarah@example.com',
      name: 'Sarah Connor',
      firstName: 'Sarah',
      lastName: 'Connor',
      customFields: { company: 'Cyberdyne Systems', github_username: 'sconnor' },
    },
    {
      email: 'devon@example.net',
      name: 'Devon Vance',
      firstName: 'Devon',
      lastName: 'Vance',
      customFields: { company: 'Pinnacle Labs', github_username: 'devonv' },
    },
  ];

  for (const c of sampleContacts) {
    const contact = await prisma.contact.upsert({
      where: {
        ownerId_email: {
          ownerId: user.id,
          email: c.email,
        },
      },
      update: {},
      create: {
        ownerId: user.id,
        email: c.email,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        customFields: c.customFields,
      },
    });

    await prisma.contactListMember.upsert({
      where: {
        contactListId_contactId: {
          contactListId: communityList.id,
          contactId: contact.id,
        },
      },
      update: {},
      create: {
        contactListId: communityList.id,
        contactId: contact.id,
      },
    });
  }

  // Create sample email template
  await prisma.emailTemplate.create({
    data: {
      ownerId: user.id,
      name: 'Quarterly Community Update',
      subject: 'Hi {{first_name}}, updates from our open-source project',
      htmlBody: `
        <p>Hi {{first_name}},</p>
        <p>Thank you for contributing to our open-source ecosystem at {{company}}!</p>
        <p>We are excited to share our latest milestone release. Check out our latest repository changes or review the release notes:</p>
        <p style="margin: 20px 0;">
          <a href="https://github.com" style="background-color: #10b981; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Explore Release Notes
          </a>
        </p>
        <p>Best regards,<br>The Maintainers Team</p>
      `.trim(),
      textBody: `
Hi {{first_name}},

Thank you for contributing to our open-source ecosystem at {{company}}!
We are excited to share our latest milestone release. Check out our latest repository changes:
https://github.com

Best regards,
The Maintainers Team
      `.trim(),
    },
  });

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
