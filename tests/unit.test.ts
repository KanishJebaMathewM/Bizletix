import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  isValidEmail,
  escapeCsvCell,
  extractMergeVariables,
  renderMergeText,
  isValidRedirectUrl,
  buildTrackingPixelHtml,
  buildUnsubscribeFooter,
} from '@bizletix/shared';
import {
  encryptToken,
  decryptToken,
  generateSecureToken,
  hashToken,
  hashPassword,
  verifyPassword,
} from '../apps/api/src/config/crypto.js';
import { TemplatesService } from '../apps/api/src/services/templates.service.js';
import { ContactsService } from '../apps/api/src/services/contacts.service.js';
import { EmailSenderService } from '../apps/api/src/services/email-sender.service.js';

describe('Unit Tests: Shared Utilities & Security', () => {
  it('normalizes email addresses consistently', () => {
    expect(normalizeEmail('  Jane.Doe@Example.Com  ')).toBe('jane.doe@example.com');
    expect(normalizeEmail('')).toBe('');
  });

  it('validates email addresses strictly', () => {
    expect(isValidEmail('alice@example.com')).toBe(true);
    expect(isValidEmail('alice.smith+tag@sub.domain.org')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
    expect(isValidEmail('@missing-user.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });

  it('prevents CSV formula injection by prepending an apostrophe to formula triggers', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1");
    expect(escapeCsvCell('+2+3')).toBe("'+2+3");
    expect(escapeCsvCell('-cmd|/c calc')).toBe("'-cmd|/c calc");
    expect(escapeCsvCell('@SUM(A1:B10)')).toBe("'@SUM(A1:B10)");
    expect(escapeCsvCell('Normal Company, Inc.')).toBe('"Normal Company, Inc."');
    expect(escapeCsvCell('Safe Text')).toBe('Safe Text');
  });

  it('extracts unique merge variables from templates', () => {
    const template = 'Hi {{first_name}}, thanks for working with {{company}}. See you {{first_name}}!';
    const vars = extractMergeVariables(template);
    expect(vars).toEqual(['first_name', 'company']);
  });

  it('renders merge variables and resolves aliases with HTML escaping', () => {
    const template = 'Hello {{name}} from {{company}}, click <a href="{{website}}">here</a>';
    const data = {
      name: '<script>alert(1)</script>',
      company: 'Acme & Co.',
      website: 'https://example.com?a=1&b=2',
      email: 'test@example.com',
    };

    const rendered = renderMergeText(template, data, { escapeForHtml: true });
    expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered).toContain('Acme &amp; Co.');
    expect(rendered).not.toContain('<script>');
  });

  it('validates redirect URLs and rejects dangerous protocols', () => {
    expect(isValidRedirectUrl('https://example.com/pricing')).toBe(true);
    expect(isValidRedirectUrl('http://localhost:3000/docs')).toBe(true);
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidRedirectUrl('file:///etc/passwd')).toBe(false);
    expect(isValidRedirectUrl('https://user:password@evil.com')).toBe(false);
  });

  it('constructs correct tracking pixel HTML and unsubscribe footers', () => {
    const pixel = buildTrackingPixelHtml('https://bizletix.example.com', 'tok_abc123');
    expect(pixel).toContain('https://bizletix.example.com/api/track/open/tok_abc123.gif');
    expect(pixel).toContain('width="1"');

    const unsubHtml = buildUnsubscribeFooter('https://bizletix.example.com', 'tok_xyz789', true);
    expect(unsubHtml).toContain('https://bizletix.example.com/api/unsubscribe/tok_xyz789');
    expect(unsubHtml).toContain('Unsubscribe');
  });
});

describe('Unit Tests: Cryptography & Storage Security', () => {
  it('encrypts and decrypts OAuth tokens using AES-256-GCM authenticated encryption', () => {
    const secretToken = 'ya29.a0AfH6SM...google-access-token-sample';
    const encrypted = encryptToken(secretToken);
    expect(encrypted).not.toBe(secretToken);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(secretToken);
  });

  it('generates high entropy tokens and hashes them for constant-time lookup', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(32);

    const hash1 = hashToken(token1);
    const hash2 = hashToken(token2);
    expect(hash1).not.toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it('hashes passwords with salt and verifies successfully', () => {
    const rawPass = 'SuperSecureP@ssw0rd123';
    const { hash } = hashPassword(rawPass);
    expect(verifyPassword(rawPass, hash)).toBe(true);
    expect(verifyPassword('WrongPassword', hash)).toBe(false);
  });
});

describe('Unit Tests: Template Sanitization & HTML-to-Text Fallback', () => {
  it('sanitizes malicious tags and dangerous attributes from template HTML', () => {
    const maliciousHtml = `
      <p>Hello world</p>
      <script>alert("pwned")</script>
      <img src="x" onerror="stealCookies()" />
      <a href="javascript:doEvil()">Malicious Link</a>
      <a href="https://acme.org">Valid Link</a>
    `;

    const sanitized = TemplatesService.sanitize(maliciousHtml);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:doEvil()');
    expect(sanitized).toContain('<a href="https://acme.org">Valid Link</a>');
  });

  it('converts HTML templates into readable plain text alternative', () => {
    const html = `
      <h1>Special Announcement</h1>
      <p>Hello <strong>Jane</strong>,</p>
      <p>Check our <a href="https://example.com/docs">documentation</a>.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    `;
    const text = TemplatesService.htmlToPlainText(html);
    expect(text).toContain('Special Announcement');
    expect(text).toContain('Hello Jane,');
    expect(text).toContain('Check our documentation (https://example.com/docs).');
    expect(text).toContain('• Item 1');
  });
});

describe('Unit Tests: CSV Parsing & Column Detection', () => {
  it('correctly parses CSV and detects email, name, and custom fields', () => {
    const csv = `Email Address,First Name,Last Name,Company,GitHub Username,Role
jane@example.com,Jane,Doe,Acme,janedoe,Maintainer
invalid-email,Bob,Smith,Widget,bobsmith,Developer`;

    const preview = ContactsService.previewCsv(csv);
    expect(preview.headers).toEqual([
      'Email Address',
      'First Name',
      'Last Name',
      'Company',
      'GitHub Username',
      'Role',
    ]);
    expect(preview.suggestedMapping.email).toBe('Email Address');
    expect(preview.suggestedMapping.firstName).toBe('First Name');
    expect(preview.suggestedMapping.company).toBe('Company');
    expect(preview.totalRows).toBe(2);
    expect(preview.previewRows[0]?.isValid).toBe(true);
    expect(preview.previewRows[1]?.isValid).toBe(false);
  });
});

describe('Unit Tests: Error Classifier & MIME Message Creation', () => {
  it('classifies Gmail errors with precise retryable flag', () => {
    expect(EmailSenderService.classifyError({ status: 401, message: 'invalid_grant' })).toEqual({
      code: 'AUTH_FAILED',
      message: 'Gmail authorization error or token expired',
      isRetryable: false,
    });

    expect(EmailSenderService.classifyError({ status: 429, message: 'User Rate Limit Exceeded' })).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Gmail sending quota or rate limit exceeded',
      isRetryable: true,
    });

    expect(EmailSenderService.classifyError({ status: 503, message: 'Backend Error' })).toEqual({
      code: 'TRANSIENT_NETWORK_ERROR',
      message: 'Temporary network or Gmail server error',
      isRetryable: true,
    });
  });

  it('constructs an RFC 2822 MIME message encoded as Base64url', () => {
    const base64url = EmailSenderService.createMimeMessage({
      toEmail: 'alice@example.com',
      fromEmail: 'sender@example.com',
      replyTo: 'replies@example.com',
      subject: 'Welcome to Bizletix!',
      htmlBody: '<p>Welcome Alice!</p>',
      textBody: 'Welcome Alice!',
    });

    expect(base64url).toBeDefined();
    expect(typeof base64url).toBe('string');
    // Decode from base64url
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    expect(decoded).toContain('To: alice@example.com');
    expect(decoded).toContain('From: sender@example.com');
    expect(decoded).toContain('Reply-To: replies@example.com');
    expect(decoded).toContain('multipart/alternative');
  });
});
