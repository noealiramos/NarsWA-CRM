import mongoose from 'mongoose';

// Bitácora (PRD §5): quién hizo qué y cuándo. Por ahora registra las decisiones del outbox.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor: { kind: { type: String, required: true }, ref: { type: String } },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
