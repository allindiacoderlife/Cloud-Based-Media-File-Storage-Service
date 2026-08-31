import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { sendError } from './utils/response.js';

export const createApp = (): Application => {
  const app = express();

  // Security & standard middleware
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(
    cors({
      origin: true, // Allow any requesting origin including Vercel preview URLs
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(requestLogger);

  // Root health route
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CloudVault Media Storage Service API',
      version: '0.1.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API endpoints under all possible rewrite prefixes
  app.use('/api/backend/api/v1', apiRouter);
  app.use('/api/backend', apiRouter);
  app.use(env.API_PREFIX, apiRouter);
  app.use('/api', apiRouter);

  // 404 handler
  app.use((req, res) => {
    sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
