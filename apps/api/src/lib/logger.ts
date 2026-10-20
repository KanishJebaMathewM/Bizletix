import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function redactSensitive(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Redact Bearer tokens, passwords, keys
    return data
      .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED]')
      .replace(/(password|secret|token|key)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('key') ||
        lower.includes('authorization') ||
        lower.includes('cookie')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitive(val);
      }
    }
    return sanitized;
  }
  return data;
}

export class Logger {
  private context: string;

  constructor(context = 'Bizletix') {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[env.LOG_LEVEL];
  }

  private format(level: LogLevel, message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...(meta ? { meta: redactSensitive(meta) } : {}),
    };
    return JSON.stringify(payload);
  }

  debug(message: string, meta?: unknown) {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, meta));
    }
  }

  info(message: string, meta?: unknown) {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, meta));
    }
  }

  warn(message: string, meta?: unknown) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, meta));
    }
  }

  error(message: string, meta?: unknown) {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, meta));
    }
  }
}

export const logger = new Logger('App');
