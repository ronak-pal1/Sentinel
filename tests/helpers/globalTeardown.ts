import { shutdownTestApp } from './testApp.js';

export default async function globalTeardown(): Promise<void> {
  await shutdownTestApp();
}
