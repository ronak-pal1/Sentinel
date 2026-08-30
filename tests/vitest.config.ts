import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    modules: [
      resolve(__dirname, 'node_modules'),
      resolve(__dirname, '../server/node_modules'),
    ],
    alias: {
      mongoose: resolve(__dirname, '../server/node_modules/mongoose'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    include: ['**/*.test.ts'],
    setupFiles: ['./helpers/setup.ts'],
    globalTeardown: './helpers/globalTeardown.ts',
    testTimeout: 30_000,
    hookTimeout: 90_000,
    teardownTimeout: 30_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
  },
});
