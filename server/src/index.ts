import type { Server } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectMongo, disconnectMongo } from './db/connect';
import { logger } from './utils/logger';

let server: Server | undefined;

async function bootstrap(): Promise<void> {
  await connectMongo();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(
      `Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`,
    );
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    await disconnectMongo();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  void shutdown('uncaughtException');
});

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
