import { randomUUID } from 'node:crypto';

// El simulador genera eventos con la misma forma que el webhook de WhatsApp Cloud API
// (ADR-001), para que el resto del sistema no distinga entre simulador y Meta.
export function buildWebhookPayload({ phone, name, text, externalId = `sim-in-${randomUUID()}`, timestamp = new Date() }) {
  const waId = phone.replace(/^\+/, '');
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'simulator',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: 'simulator', phone_number_id: 'simulator' },
              contacts: [{ wa_id: waId, profile: { name: name ?? '' } }],
              messages: [
                {
                  from: waId,
                  id: externalId,
                  timestamp: String(Math.floor(timestamp.getTime() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

// Convierte un payload con forma de webhook de Meta en eventos internos normalizados.
// Por ahora solo se soportan mensajes de texto (PENDIENTES #39).
export function parseWebhookPayload(payload) {
  const events = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
      for (const msg of value.messages ?? []) {
        if (msg.type !== 'text') continue;
        events.push({
          externalId: msg.id,
          from: `+${msg.from}`,
          name: names.get(msg.from) || undefined,
          type: 'TEXTO',
          text: msg.text?.body ?? '',
          timestamp: new Date(Number(msg.timestamp) * 1000),
          referral: msg.referral,
        });
      }
    }
  }
  return events;
}
