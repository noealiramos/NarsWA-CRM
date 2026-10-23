import { AGENT_NAME, provisionalReply } from '../agents/provisionalResponder.js';
import { Contact, Conversation, Message } from '../models/index.js';
import { sendMessage } from '../outbox/gate.js';
import { emit } from '../realtime/index.js';
import { serializeMessage } from './serializers.js';

const isDuplicateKey = (err) => err?.code === 11000;

async function withDuplicateRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    // Dos mensajes simultáneos del mismo número nuevo: el segundo upsert choca con el índice único.
    if (isDuplicateKey(err)) return fn();
    throw err;
  }
}

async function upsertContact(event) {
  const contact = await withDuplicateRetry(() =>
    Contact.findOneAndUpdate(
      { phone: event.from },
      {
        $set: { lastInboundAt: event.timestamp },
        $setOnInsert: {
          phone: event.from,
          stage: 'NUEVO',
          source: { type: event.referral ? 'ANUNCIO' : 'ORGANICO', referral: event.referral },
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    ),
  );
  if (event.name && !contact.name) {
    contact.name = event.name;
    await contact.save();
  }
  return contact;
}

// Procesa un mensaje entrante normalizado (de cualquier canal): guarda contacto, conversación
// y mensaje, y pide la respuesta al respondedor. La respuesta sale SOLO por el outbox.
export async function handleInboundMessage(event) {
  const existing = await Message.findOne({ externalId: event.externalId });
  if (existing) return { duplicate: true, inbound: existing };

  const contact = await upsertContact(event);
  const conversation = await withDuplicateRetry(() =>
    Conversation.findOneAndUpdate(
      { contact: contact._id },
      { $setOnInsert: { contact: contact._id } },
      { upsert: true, returnDocument: 'after' },
    ),
  );
  const previousMessages = await Message.countDocuments({ conversation: conversation._id });

  let inbound;
  try {
    inbound = await Message.create({
      conversation: conversation._id,
      contact: contact._id,
      direction: 'ENTRANTE',
      author: { kind: 'LEAD', ref: contact.phone },
      type: event.type,
      text: event.text,
      externalId: event.externalId,
      deliveryStatus: 'RECIBIDO',
    });
  } catch (err) {
    if (isDuplicateKey(err)) return { duplicate: true, inbound: await Message.findOne({ externalId: event.externalId }) };
    throw err;
  }

  // El lead vuelve a escribir después del primer intercambio: pasa a "En conversación" (SUPUESTOS S41).
  if (contact.stage === 'NUEVO' && previousMessages > 0) {
    contact.stage = 'EN_CONVERSACION';
    await contact.save();
  }
  await Conversation.updateOne({ _id: conversation._id }, { lastMessageAt: inbound.createdAt });
  emit('crm:message', { contactId: String(contact._id), message: serializeMessage(inbound) });

  let reply = null;
  if (conversation.mode === 'IA') {
    reply = await sendMessage({
      conversationId: conversation._id,
      text: provisionalReply({ isFirstMessage: previousMessages === 0 }),
      author: { kind: 'AGENTE', ref: AGENT_NAME },
      idempotencyKey: `reply:${inbound._id}`,
    });
  }

  return { duplicate: false, contact, conversation, inbound, reply };
}
