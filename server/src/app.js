import express from 'express';
import { errorHandler, notFound } from './middleware/errors.js';
import { crmRouter } from './routes/crm.js';
import { healthRouter } from './routes/health.js';
import { simulatorRouter } from './routes/simulator.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/simulator', simulatorRouter);
  app.use('/api', crmRouter);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
