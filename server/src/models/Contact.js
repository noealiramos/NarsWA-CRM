import mongoose from 'mongoose';

// Etapas del pipeline (PRD §5): Nuevo → En conversación → Visita agendada → Visitó →
// Pago en revisión → Socio · (Perdido en cualquier punto).
export const STAGES = ['NUEVO', 'EN_CONVERSACION', 'VISITA_AGENDADA', 'VISITO', 'PAGO_EN_REVISION', 'SOCIO', 'PERDIDO'];
export const PREFERRED_SCHEDULES = ['MANANA', 'TARDE', 'NOCHE'];
export const SOURCE_TYPES = ['ORGANICO', 'ANUNCIO'];
export const E164 = /^\+[1-9]\d{7,14}$/;

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, required: true, unique: true, match: E164 },
    preferredSchedule: { type: String, enum: PREFERRED_SCHEDULES },
    source: {
      type: { type: String, enum: SOURCE_TYPES, default: 'ORGANICO' },
      // Datos del referral de Click-to-WhatsApp, con la forma que envíe Meta.
      referral: { type: mongoose.Schema.Types.Mixed },
    },
    stage: { type: String, enum: STAGES, default: 'NUEVO', index: true },
    tags: { type: [String], default: [] },
    // Último mensaje del lead: define la ventana de 24 h de WhatsApp.
    lastInboundAt: { type: Date },
  },
  { timestamps: true },
);

export const Contact = mongoose.model('Contact', contactSchema);
