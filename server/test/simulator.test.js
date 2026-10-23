import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Contact, Conversation, Message } from '../src/models/index.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app = createApp();
const PHONE = '+5214490000001';

const send = (body) => request(app).post('/api/simulator/messages').send(body);

describe('simulador: mensaje entrante → respuesta → persistencia', () => {
  beforeAll(connectTestDb);
  beforeEach(clearTestDb);
  afterAll(disconnectTestDb);

  it('guarda el mensaje entrante y la respuesta saliente en la misma conversación', async () => {
    const res = await send({ phone: PHONE, name: 'Lead de Prueba', text: 'Hola, quiero información' });

    expect(res.status).toBe(201);
    expect(res.body.contact).toMatchObject({ phone: PHONE, name: 'Lead de Prueba', stage: 'NUEVO' });
    expect(res.body.inbound).toMatchObject({ direction: 'ENTRANTE', text: 'Hola, quiero información', deliveryStatus: 'RECIBIDO' });
    expect(res.body.reply.status).toBe('ENVIADO');
    expect(res.body.reply.message).toMatchObject({ direction: 'SALIENTE', deliveryStatus: 'ENVIADO' });
    expect(res.body.reply.message.author).toEqual({ kind: 'AGENTE', ref: 'respondedor-provisional' });

    const conversations = await Conversation.find();
    expect(conversations).toHaveLength(1);
    const messages = await Message.find().sort({ createdAt: 1 });
    expect(messages.map((m) => m.direction)).toEqual(['ENTRANTE', 'SALIENTE']);
    for (const m of messages) expect(String(m.conversation)).toBe(String(conversations[0]._id));
  });

  it('reutiliza contacto y conversación y pasa el lead a EN_CONVERSACION al volver a escribir', async () => {
    await send({ phone: PHONE, text: 'Hola' });
    const res = await send({ phone: PHONE, text: '¿Siguen ahí?' });

    expect(res.status).toBe(201);
    expect(res.body.contact.stage).toBe('EN_CONVERSACION');
    expect(await Contact.countDocuments()).toBe(1);
    expect(await Conversation.countDocuments()).toBe(1);
    expect(await Message.countDocuments()).toBe(4);
  });

  it('separa conversaciones de números distintos', async () => {
    await send({ phone: PHONE, text: 'Hola' });
    await send({ phone: '+5214490000002', text: 'Buenas' });
    const conversations = await Conversation.find();
    expect(conversations).toHaveLength(2);
    for (const c of conversations) expect(await Message.countDocuments({ conversation: c._id })).toBe(2);
  });

  it('ignora un reintento del webhook con el mismo id de mensaje', async () => {
    const body = { phone: PHONE, text: 'Hola', externalId: 'wamid.prueba-1' };
    expect((await send(body)).status).toBe(201);
    const retry = await send(body);
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);
    expect(await Message.countDocuments()).toBe(2);
  });

  it('no responde si la conversación está en modo HUMANO', async () => {
    await send({ phone: PHONE, text: 'Hola' });
    await Conversation.updateMany({}, { mode: 'HUMANO' });
    const res = await send({ phone: PHONE, text: 'Quiero hablar con una persona' });
    expect(res.body.reply).toBeNull();
    expect(await Message.countDocuments({ direction: 'SALIENTE' })).toBe(1);
  });

  it.each([
    [{ phone: '4491234567', text: 'Hola' }, 'phone'],
    [{ phone: PHONE, text: '   ' }, 'text'],
    [{ phone: PHONE }, 'text'],
  ])('responde 400 con datos inválidos (%j)', async (body, field) => {
    const res = await send(body);
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.path)).toContain(field);
    expect(await Message.countDocuments()).toBe(0);
  });

  it('responde 400 si el cuerpo no es JSON válido', async () => {
    const res = await request(app).post('/api/simulator/messages').set('Content-Type', 'application/json').send('{no-json');
    expect(res.status).toBe(400);
  });

  it('devuelve el historial de la conversación por teléfono', async () => {
    await send({ phone: PHONE, text: 'Hola' });
    const res = await request(app).get(`/api/simulator/conversations/${encodeURIComponent(PHONE)}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.messages.map((m) => m.direction)).toEqual(['ENTRANTE', 'SALIENTE']);
  });

  it('responde 404 para un número sin conversación', async () => {
    const res = await request(app).get(`/api/simulator/conversations/${encodeURIComponent('+5214499999999')}/messages`);
    expect(res.status).toBe(404);
  });
});
