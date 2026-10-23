import { getOutboundChannel } from '../channels/index.js';
import { config } from '../config/env.js';
import { AuditLog, Contact, Conversation, Message } from '../models/index.js';
import { emit } from '../realtime/index.js';
import { serializeMessage } from '../services/serializers.js';

// ÚNICA salida de mensajes hacia WhatsApp (CLAUDE.md, regla de oro 1).
// Antes de enviar aplica: modo HUMANO, idempotencia, ventana de 24 h y bitácora.
// Las plantillas fuera de la ventana todavía no existen (PENDIENTES #13).

export const WINDOW_MS = 24 * 60 * 60 * 1000;

async function audit(action, author, conversationId, details) {
  await AuditLog.create({ action, actor: author, conversation: conversationId, details });
}

export async function sendMessage({ conversationId, text, author, idempotencyKey, now = new Date() }) {
  if (idempotencyKey) {
    const existing = await Message.findOne({ idempotencyKey });
    if (existing) return { status: 'DUPLICADO', message: existing };
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error(`Conversación ${conversationId} no encontrada`);
  const contact = await Contact.findById(conversation.contact);

  if (author.kind === 'AGENTE' && conversation.mode === 'HUMANO') {
    await audit('MENSAJE_BLOQUEADO', author, conversation._id, { reason: 'MODO_HUMANO' });
    return { status: 'BLOQUEADO', reason: 'MODO_HUMANO' };
  }

  const lastInbound = contact.lastInboundAt?.getTime();
  if (!lastInbound || now.getTime() - lastInbound > WINDOW_MS) {
    await audit('MENSAJE_BLOQUEADO', author, conversation._id, { reason: 'FUERA_DE_VENTANA_24H' });
    return { status: 'BLOQUEADO', reason: 'FUERA_DE_VENTANA_24H' };
  }

  let message;
  try {
    message = await Message.create({
      conversation: conversation._id,
      contact: contact._id,
      direction: 'SALIENTE',
      author,
      type: 'TEXTO',
      text,
      idempotencyKey,
      deliveryStatus: 'PENDIENTE',
    });
  } catch (err) {
    // Dos envíos simultáneos con la misma llave: gana el primero.
    if (err.code === 11000 && idempotencyKey) {
      return { status: 'DUPLICADO', message: await Message.findOne({ idempotencyKey }) };
    }
    throw err;
  }

  try {
    const { externalId } = await getOutboundChannel(config.WA_PROVIDER).send({
      to: contact.phone,
      text,
      messageId: String(message._id),
    });
    message.externalId = externalId;
    message.deliveryStatus = 'ENVIADO';
  } catch (err) {
    message.deliveryStatus = 'FALLIDO';
    message.error = err.message;
  }
  await message.save();
  await Conversation.updateOne({ _id: conversation._id }, { lastMessageAt: message.createdAt });
  await audit(message.deliveryStatus === 'ENVIADO' ? 'MENSAJE_ENVIADO' : 'MENSAJE_FALLIDO', author, conversation._id, {
    messageId: message._id,
    provider: config.WA_PROVIDER,
    error: message.error,
  });
  emit('crm:message', { contactId: String(contact._id), message: serializeMessage(message) });

  return { status: message.deliveryStatus === 'ENVIADO' ? 'ENVIADO' : 'FALLIDO', message };
}
