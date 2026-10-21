import { google } from 'googleapis';
import { GoogleService } from './google.service.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface SendEmailOptions {
  senderConnectionId?: string | null;
  toEmail: string;
  fromEmail?: string;
  replyTo?: string | null;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  failureCode?: string;
  failureMessage?: string;
  isRetryable: boolean;
}

export class EmailSenderService {
  /**
   * Build an RFC 2822 MIME formatted message and encode as base64url string
   */
  static createMimeMessage(options: SendEmailOptions): string {
    const { toEmail, fromEmail, replyTo, subject, htmlBody, textBody } = options;
    const boundary = `====_Bizletix_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_====`;

    const headers: string[] = [
      `To: ${toEmail}`,
      fromEmail ? `From: ${fromEmail}` : '',
      replyTo ? `Reply-To: ${replyTo}` : '',
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
    ].filter(Boolean);

    const parts: string[] = [];

    // Plain text alternative
    if (textBody) {
      parts.push(
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(textBody).toString('base64'),
        ''
      );
    }

    // HTML body
    parts.push(
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(htmlBody).toString('base64'),
      '',
      `--${boundary}--`
    );

    // MIME headers must be followed by an empty line before the first body part.
    const fullMessage = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');

    // Base64url encode without padding as required by Gmail API
    return Buffer.from(fullMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Classify send error into standardized category and retryable flag
   */
  static classifyError(error: unknown): { code: string; message: string; isRetryable: boolean } {
    const err = error as Record<string, unknown>;
    const status = (err.status || err.code || (err.response as Record<string, unknown>)?.status) as number;
    const rawMessage = (err.message as string) || 'Unknown sending failure';

    const lower = rawMessage.toLowerCase();

    // Authentication failure
    if (status === 401 || lower.includes('invalid_grant') || lower.includes('token expired') || lower.includes('auth')) {
      return { code: 'AUTH_FAILED', message: 'Gmail authorization error or token expired', isRetryable: false };
    }

    // Quota / Rate limit
    if (status === 429 || lower.includes('rate') || lower.includes('quota') || lower.includes('daily limit')) {
      return { code: 'RATE_LIMIT_EXCEEDED', message: 'Gmail sending quota or rate limit exceeded', isRetryable: true };
    }

    // Invalid recipient
    if (status === 400 && (lower.includes('invalid to') || lower.includes('recipient') || lower.includes('malformed'))) {
      return { code: 'INVALID_RECIPIENT', message: 'Invalid recipient address or header format', isRetryable: false };
    }

    // Transient network issues
    if (status === 500 || status === 502 || status === 503 || lower.includes('econnreset') || lower.includes('etimedout')) {
      return { code: 'TRANSIENT_NETWORK_ERROR', message: 'Temporary network or Gmail server error', isRetryable: true };
    }

    return { code: 'PROVIDER_ERROR', message: rawMessage, isRetryable: false };
  }

  /**
   * Send an email via Gmail API or mock sender for tests
   */
  static async send(options: SendEmailOptions): Promise<SendResult> {
    // If mock sender is explicitly enabled or in test environment without connection
    if (env.ENABLE_MOCK_SENDER || (!options.senderConnectionId && process.env.NODE_ENV === 'test')) {
      logger.info('Sending email via test mock sender', { to: options.toEmail, subject: options.subject });
      return {
        success: true,
        providerMessageId: `mock-gmail-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        isRetryable: false,
      };
    }

    if (!options.senderConnectionId) {
      return {
        success: false,
        failureCode: 'NO_SENDER_CONNECTION',
        failureMessage: 'No connected Gmail account provided for sending',
        isRetryable: false,
      };
    }

    try {
      const { oauth2Client, connection } = await GoogleService.getAuthenticatedClient(options.senderConnectionId);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const rawMime = this.createMimeMessage({
        ...options,
        fromEmail: connection.email || options.fromEmail,
      });

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMime,
        },
      });

      const messageId = response.data.id || undefined;
      logger.info('Email accepted by Gmail API', {
        to: options.toEmail,
        providerMessageId: messageId,
      });

      return {
        success: true,
        providerMessageId: messageId,
        isRetryable: false,
      };
    } catch (err) {
      const classified = this.classifyError(err);
      logger.error('Failed to send email via Gmail API', {
        to: options.toEmail,
        error: classified.message,
        code: classified.code,
      });

      return {
        success: false,
        failureCode: classified.code,
        failureMessage: classified.message,
        isRetryable: classified.isRetryable,
      };
    }
  }
}
