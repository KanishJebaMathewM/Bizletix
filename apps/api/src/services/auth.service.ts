import { prisma } from '../lib/prisma.js';
import { generateSecureToken, hashToken, hashPassword, verifyPassword } from '../config/crypto.js';
import { normalizeEmail } from '@bizletix/shared';
import { logger } from '../lib/logger.js';

const SESSION_DURATION_DAYS = 14;

export class AuthService {
  /**
   * Find or create user by email
   */
  static async findOrCreateUser(email: string, name?: string | null) {
    const normalized = normalizeEmail(email);
    let user = await prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalized,
          name: name ?? null,
        },
      });
      logger.info('Created new user', { userId: user.id, email: normalized });
    }

    return user;
  }

  /**
   * Register with email and password
   */
  static async registerWithPassword(email: string, password: string, name?: string | null) {
    const normalized = normalizeEmail(email);
    const existing = await prisma.user.findUnique({
      where: { email: normalized },
    });

    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const { hash } = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: name ?? null,
        passwordHash: hash,
      },
    });

    logger.info('User registered with password', { userId: user.id });
    return user;
  }

  /**
   * Login with email and password
   */
  static async loginWithPassword(email: string, password: string) {
    const normalized = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  /**
   * Create a new secure session
   */
  static async createSession(userId: string) {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        ownerId: userId,
        actorId: userId,
        action: 'user_login',
        resourceType: 'session',
        resourceId: session.id,
      },
    });

    return { rawToken, expiresAt };
  }

  /**
   * Validate session token and return user
   */
  static async validateSession(rawToken: string) {
    if (!rawToken) return null;
    const tokenHash = hashToken(rawToken);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  }

  /**
   * Revoke session
   */
  static async revokeSession(rawToken: string) {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findUnique({ where: { tokenHash } });
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
      await prisma.auditEvent.create({
        data: {
          ownerId: session.userId,
          actorId: session.userId,
          action: 'user_logout',
          resourceType: 'session',
          resourceId: session.id,
        },
      });
    }
  }
}
