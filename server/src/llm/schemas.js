import { z } from 'zod';
import { MODEL_ID } from '../config/env.js';
import { LlmError } from './errors.js';

// Esquemas de entrada y salida de `generate` (ADR-004 §1).

// Tope de la línea de comandos de Windows (~32 767); se aplica en ambos motores.
export const MAX_SYSTEM_CHARS = 24000;
export const DEFAULT_TIMEOUT_MS = 60000;

// Sin NUL: spawn lo rechaza (ERR_INVALID_ARG_VALUE) y no tiene sentido en una conversación.
const nonBlank = z
  .string()
  .refine((value) => value.trim().length > 0, 'no puede estar vacío')
  .refine((value) => !value.includes('\0'), 'no puede contener caracteres nulos');

export const inputSchema = z.object({
  system: nonBlank
    .refine((value) => value.length <= MAX_SYSTEM_CHARS, `excede ${MAX_SYSTEM_CHARS} caracteres`)
    // Viaja como argumento del CLI: no puede parecer una bandera.
    .refine((value) => !value.trimStart().startsWith('-'), 'no puede iniciar con "-"'),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: nonBlank }))
    .min(1)
    .max(100),
  model: z.string().regex(MODEL_ID, 'id de modelo inválido').optional(),
  timeoutMs: z.number().int().min(1000).max(300000).optional(),
});

const count = z.number().int().min(0);

export const usageSchema = z.object({
  inputTokens: count,
  outputTokens: count,
  cacheCreationInputTokens: count,
  cacheReadInputTokens: count,
  costUsd: z.number().nullable(),
});

// Lo que devuelve un motor (sin durationMs, que agrega index.js).
export const engineOutputSchema = z.object({
  text: z.string().transform((value) => value.trim()).pipe(z.string().min(1)),
  usage: usageSchema,
});

// Los mensajes de zod no incluyen los valores recibidos: solo ruta y motivo.
export function describeIssues(error) {
  return error.issues.map((i) => `${i.path.join('.') || 'entrada'}: ${i.message}`).join('; ');
}

// Valida la entrada y fusiona mensajes consecutivos del mismo rol con "\n\n".
// Tras fusionar, el primero y el último deben ser del usuario.
export function parseInput(input) {
  const result = inputSchema.safeParse(input);
  if (!result.success) throw new LlmError('INPUT', `Entrada inválida: ${describeIssues(result.error)}`);

  const messages = [];
  for (const { role, content } of result.data.messages) {
    const last = messages.at(-1);
    if (last?.role === role) last.content += `\n\n${content.trim()}`;
    else messages.push({ role, content: content.trim() });
  }
  if (messages[0].role !== 'user' || messages.at(-1).role !== 'user') {
    throw new LlmError('INPUT', 'Entrada inválida: la conversación debe iniciar y terminar con un mensaje de usuario');
  }
  return { ...result.data, messages };
}
