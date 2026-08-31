import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

// Only listen on port when running locally / standalone server (not on Vercel serverless)
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Storage Service API running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
    logger.info(`📡 API root available at http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`🩺 Health status available at http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  });

  const handleShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down server gracefully...`);
    server.close(() => {
      logger.info('Server closed. Process terminating.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
