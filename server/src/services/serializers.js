// Formas públicas (JSON de la API y eventos de Socket.IO) de los documentos.

export function serializeMessage(m) {
  return {
    id: String(m._id),
    conversationId: String(m.conversation),
    contactId: String(m.contact),
    direction: m.direction,
    author: { kind: m.author.kind, ref: m.author.ref },
    type: m.type,
    text: m.text,
    deliveryStatus: m.deliveryStatus,
    createdAt: m.createdAt,
  };
}

export function serializeContact(c) {
  return {
    id: String(c._id),
    name: c.name ?? null,
    phone: c.phone,
    stage: c.stage,
    preferredSchedule: c.preferredSchedule ?? null,
    source: c.source?.type ?? 'ORGANICO',
    lastInboundAt: c.lastInboundAt ?? null,
    createdAt: c.createdAt,
  };
}

export function serializeConversation(c) {
  return {
    id: String(c._id),
    contactId: String(c.contact),
    mode: c.mode,
    activeAgent: c.activeAgent,
    status: c.status,
    lastMessageAt: c.lastMessageAt ?? null,
  };
}
