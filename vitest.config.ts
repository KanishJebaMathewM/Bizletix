import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    env: {
      DATABASE_URL: 'postgresql://bizletix:bizletix_dev_password@localhost:5432/bizletix?schema=public',
      SESSION_SECRET: 'dev-bizletix-session-secret-min16chars-for-dev',
      TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ENABLE_MOCK_SENDER: 'true',
    },
    alias: {
      '@bizletix/shared': path.resolve(__dirname, './packages/shared/src'),
    },
  },
});
