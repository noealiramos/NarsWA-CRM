// Respondedor PROVISIONAL y determinista (decisión de la Fase 3; PENDIENTES #40).
// Sustituye a los agentes de IA (router, info, ventas, pagos) mientras no existan.
// No da precios, horarios, promociones ni confirmaciones de pago: no hay base de conocimiento
// y los agentes solo pueden responder con datos de ella (CLAUDE.md, regla de oro 4).

export const AGENT_NAME = 'respondedor-provisional';

const FIRST_REPLY =
  '¡Hola! 👋 Gracias por escribir a Fuerza Gym. Recibimos tu mensaje y una persona del equipo te dará seguimiento muy pronto.';
const FOLLOW_UP_REPLY = '¡Gracias! 💪 Recibimos tu mensaje y el equipo de Fuerza Gym te responderá muy pronto.';

export function provisionalReply({ isFirstMessage }) {
  return isFirstMessage ? FIRST_REPLY : FOLLOW_UP_REPLY;
}
