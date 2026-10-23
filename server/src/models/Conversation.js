import mongoose from 'mongoose';

export const CONVERSATION_MODES = ['IA', 'HUMANO'];
export const CONVERSATION_STATUSES = ['ABIERTA', 'CERRADA'];

// Una conversación por contacto en el MVP (SUPUESTOS S40).
const conversationSchema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, unique: true },
    mode: { type: String, enum: CONVERSATION_MODES, default: 'IA' },
    activeAgent: { type: String, default: 'router' },
    assignedUser: { type: mongoose.Schema.Types.ObjectId, default: null },
    status: { type: String, enum: CONVERSATION_STATUSES, default: 'ABIERTA' },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
