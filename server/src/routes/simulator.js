import { Router } from 'express';
import { z } from 'zod';
import { buildWebhookPayload, parseWebhookPayload } from '../channels/simulator/inbound.js';
import { config } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { E164 } from '../models/Contact.js';
import { getContactConversation } from '../services/crm.js';
import { handleInboundMessage } from '../services/inbound.js';
import { serializeContact, serializeConversation, serializeMessage } from '../services/serializers.js';

export const simulatorRouter = Router();

const phoneSchema = z.string().trim().regex(E164, 'Usa formato internacional E.164, por ejemplo +5214491234567');

const inboundBodySchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().max(80).optional(),
  text: z.string().trim().min(1, 'El mensaje no puede estar vacío').max(4096),
  // Permite simular un reintento del webhook con el mismo id de mensaje.
  externalId: z.string().trim().min(1).max(200).optional(),
});

simulatorRouter.use((req, res, next) => {
  if (config.WA_PROVIDER !== 'simulator') throw new HttpError(404, 'El simulador solo está disponible con WA_PROVIDER=simulator');
  next();
});

// El "teléfono" del lead envía un mensaje: se convierte en un webhook simulado.
simulatorRouter.post('/messages', async (req, res) => {
  const body = inboundBodySchema.parse(req.body);
  const [event] = parseWebhookPayload(buildWebhookPayload(body));
  const result = await handleInboundMessage(event);

  if (result.duplicate) {
    return res.status(200).json({ duplicate: true, inbound: serializeMessage(result.inbound) });
  }
  res.status(201).json({
    duplicate: false,
    contact: serializeContact(result.contact),
    conversation: serializeConversation(result.conversation),
    inbound: serializeMessage(result.inbound),
    reply: result.reply && {
      status: result.reply.status,
      reason: result.reply.reason,
      message: result.reply.message ? serializeMessage(result.reply.message) : null,
    },
  });
});

simulatorRouter.get('/conversations/:phone/messages', async (req, res) => {
  const phone = phoneSchema.parse(req.params.phone);
  const data = await getContactConversation({ phone });
  if (!data) throw new HttpError(404, 'Este número todavía no tiene conversación');
  res.json(data);
});
