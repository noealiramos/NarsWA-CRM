import { randomUUID } from 'node:crypto';
import { emit } from '../../realtime/index.js';

// "Entrega" un mensaje al teléfono simulado: lo emite por Socket.IO a la UI del simulador.
// Solo outbox/gate.js puede llamar a este módulo (CLAUDE.md, regla de oro 1).
export async function send({ to, text, messageId }) {
  const externalId = `sim-out-${randomUUID()}`;
  emit('simulator:outbound', { to, text, messageId, externalId, sentAt: new Date().toISOString() });
  return { externalId };
}
