import { z } from 'zod';

export const HISTORY_LIMIT = 20;
export const HISTORY_START_NOTE = '(Inicio del historial disponible. Los mensajes anteriores no se incluyen.)';
const historySchema = z.array(z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).refine((text) => !text.includes('\0')),
})).min(1);

// Recibe turnos ya cargados por el llamador. La consulta de Message y los marcadores
// de media pertenecen a buildHistory (paso 5), no a este módulo puro.
export function normalizeHistory(messages) {
  const parsed = historySchema.safeParse(messages);
  if (!parsed.success) throw new TypeError('Historial inválido: se requieren turnos user/assistant con texto');
  const history = parsed.data.slice(-HISTORY_LIMIT);
  if (history.at(-1).role !== 'user') throw new TypeError('El historial debe terminar con user');
  if (history[0].role === 'assistant') history.unshift({ role: 'user', content: HISTORY_START_NOTE });
  return history;
}
