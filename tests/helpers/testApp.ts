import type { Express } from 'express';
import type { Server } from 'node:http';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { applyTestEnv } from './env.js';

export type TestAppContext = {
  app: Express;
  mongod: MongoMemoryServer;
  server: Server;
  baseUrl: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __sentinelTestContext: TestAppContext | undefined;
  // eslint-disable-next-line no-var
  var __sentinelTestStartPromise: Promise<TestAppContext> | undefined;
}

async function startTestAppInternal(): Promise<TestAppContext> {
  applyTestEnv('mongodb://127.0.0.1:27017/sentinel-test-pending');

  const mongoose = (await import('mongoose')).default;

  let mongod: MongoMemoryServer;
  if (mongoose.connection.readyState === 0) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 60_000,
      },
    });
    applyTestEnv(mongod.getUri());
    await import('../../server/src/models/index.js');
    const { connectMongo } = await import('../../server/src/db/connect.js');
    await connectMongo();
  } else {
    mongod = globalThis.__sentinelTestContext!.mongod;
  }

  const { createApp } = await import('../../server/src/app.js');
  const app = createApp();

  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('Failed to bind test server');
  }

  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const context: TestAppContext = { app, mongod, server, baseUrl };
  globalThis.__sentinelTestContext = context;
  return context;
}

export async function acquireTestApp(): Promise<TestAppContext> {
  if (globalThis.__sentinelTestContext) {
    return globalThis.__sentinelTestContext;
  }
  if (!globalThis.__sentinelTestStartPromise) {
    globalThis.__sentinelTestStartPromise = startTestAppInternal();
  }
  return globalThis.__sentinelTestStartPromise;
}

export async function shutdownTestApp(): Promise<void> {
  const context = globalThis.__sentinelTestContext;
  if (!context) return;

  const mongoose = (await import('mongoose')).default;
  const { disconnectMongo } = await import('../../server/src/db/connect.js');

  await new Promise<void>((resolve, reject) => {
    context.server.close((err) => (err ? reject(err) : resolve()));
  });

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await disconnectMongo();
  }

  await context.mongod.stop();
  globalThis.__sentinelTestContext = undefined;
  globalThis.__sentinelTestStartPromise = undefined;
}

export function getTestApp(): Express {
  const context = globalThis.__sentinelTestContext;
  if (!context) {
    throw new Error('Test app not started — call acquireTestApp() in beforeAll');
  }
  return context.app;
}

export function getBaseUrl(): string {
  const context = globalThis.__sentinelTestContext;
  if (!context) {
    throw new Error('Test app not started — call acquireTestApp() in beforeAll');
  }
  return context.baseUrl;
}

export async function resetDatabase(): Promise<void> {
  const mongoose = (await import('mongoose')).default;
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
}
