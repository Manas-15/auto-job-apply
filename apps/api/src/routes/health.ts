import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    let db = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    res.json({
      status: 'ok',
      db,
      aiProvider: env.AI_PROVIDER,
      env: env.NODE_ENV,
    });
  }),
);
