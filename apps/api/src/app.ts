import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { atsRouter } from './routes/ats.js';
import { healthRouter } from './routes/health.js';
import { jobsRouter } from './routes/jobs.js';
import { resumesRouter } from './routes/resumes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  // Reflect any origin in development (localhost + LAN IP), or in production
  // when CORS_ORIGINS is "*" (convenient for a self-hosted single-server deploy
  // where the public origin isn't known ahead of time). Otherwise use the
  // explicit allowlist.
  const allowAnyOrigin = env.NODE_ENV === 'development' || corsOrigins.includes('*');
  app.use(cors({ origin: allowAnyOrigin ? true : corsOrigins }));
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Friendly index so hitting the base URL isn't a bare 404.
  app.get('/', (_req, res) => {
    res.json({
      name: 'Auto Job Apply API',
      status: 'ok',
      docs: 'See README.md',
      dashboard: 'http://localhost:3000',
      endpoints: [
        'GET  /health',
        'GET  /api/jobs',
        'POST /api/jobs',
        'GET  /api/jobs/:id',
        'POST /api/jobs/:id/analyze',
        'POST /api/ats/score',
        'POST /api/ats/preview',
      ],
    });
  });

  app.use('/health', healthRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/ats', atsRouter);
  app.use('/api/resumes', resumesRouter);

  app.use((_req, res) => res.status(404).json({ error: 'NotFound', message: 'Route not found' }));
  app.use(errorHandler);

  return app;
}
