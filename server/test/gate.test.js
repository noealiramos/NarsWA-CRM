import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditLog, Contact, Conversation, Message } from '../src/models/index.js';
import { sendMessage, WINDOW_MS } from '../src/outbox/gate.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const agent = { kind: 'AGENTE', ref: 'prueba' };

async function createConversation({ mode = 'IA', lastInboundAt = new Date() } = {}) {
  const contact = await Contact.create({ phone: '+5214490000010', lastInboundAt });
  return Conversation.create({ contact: contact._id, mode });
}

describe('outbox/gate.js', () => {
  beforeAll(connectTestDb);
  beforeEach(clearTestDb);
  afterAll(disconnectTestDb);

  it('envía, guarda el mensaje saliente y lo registra en la bitácora', async () => {
    const conversation = await createConversation();
    const result = await sendMessage({ conversationId: conversation._id, text: 'Hola', author: agent });
    expect(result.status).toBe('ENVIADO');
    expect(result.message.externalId).toMatch(/^sim-out-/);
    expect(await AuditLog.countDocuments({ action: 'MENSAJE_ENVIADO' })).toBe(1);
  });

  it('bloquea a los agentes cuando la conversación está en modo HUMANO', async () => {
    const conversation = await createConversation({ mode: 'HUMANO' });
    const result = await sendMessage({ conversationId: conversation._id, text: 'Hola', author: agent });
    expect(result).toEqual({ status: 'BLOQUEADO', reason: 'MODO_HUMANO' });
    expect(await Message.countDocuments()).toBe(0);
    expect(await AuditLog.countDocuments({ action: 'MENSAJE_BLOQUEADO' })).toBe(1);
  });

  it('bloquea mensajes fuera de la ventana de 24 h', async () => {
    const lastInboundAt = new Date();
    const conversation = await createConversation({ lastInboundAt });
    const now = new Date(lastInboundAt.getTime() + WINDOW_MS + 1000);
    const result = await sendMessage({ conversationId: conversation._id, text: 'Hola', author: agent, now });
    expect(result).toEqual({ status: 'BLOQUEADO', reason: 'FUERA_DE_VENTANA_24H' });
    expect(await Message.countDocuments()).toBe(0);
  });

  it('es idempotente: la misma llave no envía dos veces', async () => {
    const conversation = await createConversation();
    const input = { conversationId: conversation._id, text: 'Hola', author: agent, idempotencyKey: 'k-1' };
    const [a, b] = await Promise.all([sendMessage(input), sendMessage(input)]);
    expect([a.status, b.status].sort()).toEqual(['DUPLICADO', 'ENVIADO']);
    expect(await Message.countDocuments()).toBe(1);
  });
});
