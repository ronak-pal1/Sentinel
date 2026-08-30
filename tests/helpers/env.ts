import { resolve } from 'node:path';

/** 32-byte AES key as 64 hex chars — test-only, never use in production. */
export const TEST_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export function applyTestEnv(mongodbUri: string): void {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongodbUri;
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.SERVER_PUBLIC_URL = 'http://localhost:3000';
  process.env.SETTINGS_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  process.env.RATE_LIMIT_MAX = '1000';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  // Keep mongodb-memory-server cache inside the repo (CI + sandbox friendly)
  process.env.MONGOMS_DOWNLOAD_DIR = resolve(
    import.meta.dirname,
    '../.cache/mongodb-binaries',
  );
}
