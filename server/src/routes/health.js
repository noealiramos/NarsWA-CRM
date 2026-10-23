import { Router } from 'express';
import { config } from '../config/env.js';
import { dbName, dbStatus } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    db,
    database: db === 'connected' ? dbName() : null,
    waProvider: config.WA_PROVIDER,
  });
});
