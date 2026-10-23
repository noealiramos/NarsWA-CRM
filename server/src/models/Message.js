import mongoose from 'mongoose';

export const DIRECTIONS = ['ENTRANTE', 'SALIENTE'];
export const AUTHOR_KINDS = ['LEAD', 'AGENTE', 'USUARIO', 'SISTEMA'];
export const MESSAGE_TYPES = ['TEXTO', 'IMAGEN', 'AUDIO', 'PDF', 'PLANTILLA'];
export const DELIVERY_STATUSES = ['RECIBIDO', 'PENDIENTE', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO'];

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    direction: { type: String, enum: DIRECTIONS, required: true },
    author: {
      kind: { type: String, enum: AUTHOR_KINDS, required: true },
      // Nombre del agente, id del usuario o teléfono del lead.
      ref: { type: String },
    },
    type: { type: String, enum: MESSAGE_TYPES, default: 'TEXTO' },
    text: { type: String, maxlength: 4096 },
    // Id del mensaje en el canal (wamid en Meta). Evita procesar dos veces el mismo mensaje.
    externalId: { type: String },
    // Llave de idempotencia de los mensajes salientes (outbox/gate.js).
    idempotencyKey: { type: String },
    deliveryStatus: { type: String, enum: DELIVERY_STATUSES, required: true },
    error: { type: String },
  },
  { timestamps: true },
);

messageSchema.index({ externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } });
messageSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
messageSchema.index({ conversation: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
