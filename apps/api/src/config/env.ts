import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  PUBLIC_TRACKING_BASE_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  DATABASE_URL: z.string().default('postgresql://Bizletix:Bizletix_dev_password@localhost:5432/Bizletix?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters').default('dev-Bizletix-session-secret-min16chars-for-dev'),
  // 32-byte hex key = 64 hex characters
  TOKEN_ENCRYPTION_KEY: z.string().length(64, 'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:4000/api/auth/google/callback'),
  
  DEFAULT_MAX_EMAILS_PER_DAY: z.string().transform(Number).default('500'),
  DEFAULT_SEND_DELAY_MS: z.string().transform(Number).default('300'),
  ENABLE_MOCK_SENDER: z.string().transform((v) => v === 'true').default('false'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Configuration validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    // In production fail immediately; in dev/test provide safe fallback if possible
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  return result.success ? result.data : envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://Bizletix:Bizletix_dev_password@localhost:5432/Bizletix?schema=public',
    ...process.env
  });
}

export const env = parseEnv();
