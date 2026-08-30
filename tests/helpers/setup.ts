import { beforeAll, beforeEach } from 'vitest';
import { acquireTestApp, resetDatabase } from './testApp.js';

beforeAll(async () => {
  await acquireTestApp();
}, 90_000);

beforeEach(async () => {
  await resetDatabase();
});
