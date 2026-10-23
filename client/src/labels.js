// Textos de interfaz para los valores del dominio (PRD §5).
export const STAGE_LABELS = {
  NUEVO: 'Nuevo',
  EN_CONVERSACION: 'En conversación',
  VISITA_AGENDADA: 'Visita agendada',
  VISITO: 'Visitó',
  PAGO_EN_REVISION: 'Pago en revisión',
  SOCIO: 'Socio',
  PERDIDO: 'Perdido',
};

export const AUTHOR_LABELS = {
  LEAD: 'Lead',
  AGENTE: 'Agente',
  USUARIO: 'Equipo',
  SISTEMA: 'Sistema',
};

export const E164 = /^\+[1-9]\d{7,14}$/;

const timeFormat = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatDateTime(value) {
  return value ? timeFormat.format(new Date(value)) : '';
}

// Agrega mensajes a una lista sin duplicarlos (llegan por HTTP y por Socket.IO).
export function mergeMessages(current, incoming) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, { ...byId.get(m.id), ...m });
  return [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
