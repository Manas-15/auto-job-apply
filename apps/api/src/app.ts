import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { atsRouter } from './routes/ats.js';
import { healthRouter } from './routes/health.js';
import { jobsRouter } from './routes/jobs.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use('/health', healthRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/ats', atsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'NotFound', message: 'Route not found' }));
  app.use(errorHandler);

  return app;
}
