import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectTestDb, disconnectTestDb, TEST_DB_NAME } from './helpers/db.js';

const app = createApp();

describe('GET /api/health', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  it('reporta la base de datos conectada', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'connected', database: TEST_DB_NAME, waProvider: 'simulator' });
  });

  it('responde 404 en JSON para rutas desconocidas de la API', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
