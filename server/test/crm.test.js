import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app = createApp();

describe('API del CRM', () => {
  beforeAll(connectTestDb);
  beforeEach(clearTestDb);
  afterAll(disconnectTestDb);

  it('lista contactos con etapa, conversación y último mensaje', async () => {
    await request(app).post('/api/simulator/messages').send({ phone: '+5214490000003', name: 'Ana Prueba', text: 'Hola' });
    const res = await request(app).get('/api/contacts');

    expect(res.status).toBe(200);
    expect(res.body.stages).toContain('NUEVO');
    expect(res.body.contacts).toHaveLength(1);
    const [contact] = res.body.contacts;
    expect(contact).toMatchObject({ name: 'Ana Prueba', stage: 'NUEVO', messageCount: 2 });
    expect(contact.conversation.mode).toBe('IA');
    expect(contact.lastMessage.direction).toBe('SALIENTE');
  });

  it('filtra por etapa y valida el filtro', async () => {
    await request(app).post('/api/simulator/messages').send({ phone: '+5214490000004', text: 'Hola' });
    expect((await request(app).get('/api/contacts?stage=SOCIO')).body.contacts).toHaveLength(0);
    expect((await request(app).get('/api/contacts?stage=NUEVO')).body.contacts).toHaveLength(1);
    expect((await request(app).get('/api/contacts?stage=INVENTADA')).status).toBe(400);
  });

  it('devuelve la conversación de un contacto y valida el id', async () => {
    await request(app).post('/api/simulator/messages').send({ phone: '+5214490000005', text: 'Hola' });
    const { body } = await request(app).get('/api/contacts');
    const res = await request(app).get(`/api/contacts/${body.contacts[0].id}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect((await request(app).get('/api/contacts/no-es-un-id')).status).toBe(400);
    expect((await request(app).get('/api/contacts/0123456789abcdef01234567')).status).toBe(404);
  });
});
