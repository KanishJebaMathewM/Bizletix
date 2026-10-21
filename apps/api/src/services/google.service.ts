import { google } from 'googleapis';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { encryptToken, decryptToken, generateSecureToken } from '../config/crypto.js';
import { logger } from '../lib/logger.js';
import { normalizeEmail } from '@bizletix/shared';

// The exact minimal scopes needed: gmail.send (send only, not broad mailbox reading), plus identity scopes
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// In-memory or cache state store for CSRF validation
const oauthStateCache = new Map<string, { userId: string; expiresAt: number }>();

export class GoogleService {
  /**
   * Create an OAuth2 client configured with application credentials
   */
  static getOAuth2Client() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate authorization URL with CSRF protection state
   */
  static generateAuthUrl(userId: string): { url: string; state: string } {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error(
        'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.'
      );
    }

    const state = generateSecureToken(24);
    // State expires in 10 minutes
    oauthStateCache.set(state, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });

    const oauth2Client = this.getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      prompt: 'consent',     // Force consent to ensure refresh token is returned
      scope: GMAIL_SCOPES,
      state,
    });

    return { url, state };
  }

  /**
   * Handle OAuth2 callback, exchange code for tokens, encrypt and persist
   */
  static async handleAuthCallback(code: string, state: string) {
    const cached = oauthStateCache.get(state);
    if (!cached || cached.expiresAt < Date.now()) {
      oauthStateCache.delete(state);
      throw new Error('Invalid or expired OAuth state parameter (potential CSRF). Please retry connecting.');
    }
    const { userId } = cached;
    oauthStateCache.delete(state);

    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Google did not return an access token');
    }

    // Set credentials on client to inspect authenticated identity
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const connectedEmail = userInfo.data.email || undefined;

    let connectionUserId = userId;
    if (!connectionUserId || !(await prisma.user.findUnique({ where: { id: connectionUserId }, select: { id: true } }))) {
      if (!connectedEmail) {
        throw new Error('Google did not return an email address to create your Bizletix account');
      }

      const user = await prisma.user.upsert({
        where: { email: normalizeEmail(connectedEmail) },
        update: { name: userInfo.data.name ?? undefined },
        create: {
          email: normalizeEmail(connectedEmail),
          name: userInfo.data.name ?? null,
        },
        select: { id: true },
      });
      connectionUserId = user.id;
    }

    // Check if user already had a connection or existing refresh token
    const existingConnection = await prisma.googleConnection.findFirst({
      where: { userId: connectionUserId },
    });

    // If Google didn't return a refresh token (can happen on re-auth without prompt), retain existing
    let refreshTokenToSave = tokens.refresh_token;
    if (!refreshTokenToSave && existingConnection) {
      try {
        refreshTokenToSave = decryptToken(existingConnection.encryptedRefreshToken);
      } catch {
        refreshTokenToSave = '';
      }
    }

    if (!refreshTokenToSave) {
      logger.warn('No refresh token received from Google OAuth exchange', { userId: connectionUserId });
    }

    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(refreshTokenToSave || '');
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    const scopesStr = JSON.stringify(tokens.scope ? tokens.scope.split(' ') : GMAIL_SCOPES);

    let connection;
    if (existingConnection) {
      connection = await prisma.googleConnection.update({
        where: { id: existingConnection.id },
        data: {
          email: connectedEmail ?? existingConnection.email,
          encryptedAccessToken,
          encryptedRefreshToken,
          scopes: scopesStr,
          expiresAt,
          connectionStatus: 'connected',
        },
      });
    } else {
      connection = await prisma.googleConnection.create({
        data: {
          userId: connectionUserId,
          email: connectedEmail,
          encryptedAccessToken,
          encryptedRefreshToken,
          scopes: scopesStr,
          expiresAt,
          connectionStatus: 'connected',
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        ownerId: connectionUserId,
        actorId: connectionUserId,
        action: 'google_connected',
        resourceType: 'google_connection',
        resourceId: connection.id,
        limitedMetadata: { connectedEmail },
      },
    });

    logger.info('Google account successfully connected', { userId, email: connectedEmail });
    return connection;
  }

  /**
   * Get an authorized OAuth2Client for a given user connection.
   * Automatically refreshes expired access tokens and persists updated credentials.
   */
  static async getAuthenticatedClient(connectionId: string, userId?: string) {
    const connection = await prisma.googleConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Google connection not found: ${connectionId}`);
    }

    if (userId && connection.userId !== userId) {
      throw new Error('Unauthorized access to Google connection');
    }

    const accessToken = decryptToken(connection.encryptedAccessToken);
    const refreshToken = decryptToken(connection.encryptedRefreshToken);

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      expiry_date: connection.expiresAt?.getTime(),
    });

    // Check if token is expired or expiring within 60 seconds
    const isExpired = connection.expiresAt ? connection.expiresAt.getTime() <= Date.now() + 60000 : false;

    if (isExpired && refreshToken) {
      try {
        logger.info('Refreshing expired Google access token', { connectionId });
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        const updatedAccessToken = credentials.access_token ? encryptToken(credentials.access_token) : connection.encryptedAccessToken;
        const updatedRefreshToken = credentials.refresh_token ? encryptToken(credentials.refresh_token) : connection.encryptedRefreshToken;
        const updatedExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : connection.expiresAt;

        await prisma.googleConnection.update({
          where: { id: connectionId },
          data: {
            encryptedAccessToken: updatedAccessToken,
            encryptedRefreshToken: updatedRefreshToken,
            expiresAt: updatedExpiresAt,
            connectionStatus: 'connected',
          },
        });
      } catch (err: unknown) {
        logger.error('Failed to refresh Google access token', {
          connectionId,
          error: err instanceof Error ? err.message : String(err),
        });
        await prisma.googleConnection.update({
          where: { id: connectionId },
          data: { connectionStatus: 'expired' },
        });
        throw new Error('Google authorization expired or was revoked. Please reconnect your account.');
      }
    }

    return { oauth2Client, connection };
  }

  /**
   * Get connection status for user
   */
  static async getConnectionStatus(userId: string) {
    const connection = await prisma.googleConnection.findFirst({
      where: { userId },
      select: {
        id: true,
        userId: true,
        email: true,
        scopes: true,
        expiresAt: true,
        connectionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return null;
    }

    let parsedScopes: string[] = [];
    try {
      parsedScopes = JSON.parse(connection.scopes);
    } catch {
      parsedScopes = connection.scopes.split(' ');
    }

    return {
      id: connection.id,
      userId: connection.userId,
      email: connection.email || undefined,
      scopes: parsedScopes,
      expiresAt: connection.expiresAt?.toISOString() || null,
      connectionStatus: connection.connectionStatus as 'connected' | 'expired' | 'revoked' | 'error',
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }

  /**
   * Disconnect and revoke credentials
   */
  static async disconnect(userId: string) {
    const connection = await prisma.googleConnection.findFirst({
      where: { userId },
    });

    if (!connection) return;

    try {
      const accessToken = decryptToken(connection.encryptedAccessToken);
      const oauth2Client = this.getOAuth2Client();
      await oauth2Client.revokeToken(accessToken).catch(() => {});
    } catch {
      // Ignore revocation error if token was already revoked
    }

    await prisma.googleConnection.delete({
      where: { id: connection.id },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId: userId,
        actorId: userId,
        action: 'google_disconnected',
        resourceType: 'google_connection',
        resourceId: connection.id,
      },
    });

    logger.info('Google connection revoked and removed', { userId });
  }
}
