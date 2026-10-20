import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../apps/api/src/app.js';
import { EmailSenderService } from '../apps/api/src/services/email-sender.service.js';

describe('Integration Tests: Bizletix API Endpoints', () => {
  const app = createApp();

  it('GET /health returns 200 and healthy status metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      service: 'Bizletix API',
      version: '1.0.0',
    });
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/track/open/:token.gif returns 200, image/gif, and strict anti-cache headers', async () => {
    const res = await request(app).get('/api/track/open/sample_test_token_123.gif');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/gif');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['cache-control']).toContain('no-cache');
    expect(res.headers['pragma']).toBe('no-cache');
    expect(res.body).toBeDefined();
  });

  it('GET /api/track/click/:token returns 404 for invalid or non-existent tracking token', async () => {
    const res = await request(app).get('/api/track/click/non_existent_token_456');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Link Not Found');
  });

  it('GET /api/unsubscribe/:token returns 404 error JSON for invalid token', async () => {
    const res = await request(app).get('/api/unsubscribe/invalid_unsub_token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Invalid or expired unsubscribe link',
    });
  });

  it('enforces authentication on protected endpoint /api/auth/me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('enforces authentication on protected endpoint /api/contacts', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('enforces authentication on protected endpoint /api/campaigns', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('enforces authentication on protected endpoint /api/templates', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('safe redirection on /api/auth/google when Google OAuth credentials need setup', async () => {
    const res = await request(app).get('/api/auth/google');
    // If credentials are empty in test env, it redirects with an error query param rather than crashing
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login?error=');
  });

  it('executes email send via test mock provider mode', async () => {
    const result = await EmailSenderService.send({
      toEmail: 'contributor@example.org',
      fromEmail: 'maintainer@example.org',
      subject: 'Thank you for your pull request!',
      htmlBody: '<p>Thank you for contributing to open source.</p>',
      textBody: 'Thank you for contributing to open source.',
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBeDefined();
    expect(result.providerMessageId).toContain('mock-gmail-');
  });
});
