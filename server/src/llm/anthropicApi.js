import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { LlmError, clip, isRetryableStatus } from './errors.js';

// Motor `api` (ADR-004 §4): SDK oficial de Anthropic, turnos reales y sin herramientas.
// Es el motor para producción.

export const MAX_TOKENS = 1024;

const nullableCount = z.number().int().min(0).nullish().transform((value) => value ?? 0);

const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  stop_reason: z.string().nullish(),
  usage: z.object({
    input_tokens: nullableCount,
    output_tokens: nullableCount,
    cache_creation_input_tokens: nullableCount,
    cache_read_input_tokens: nullableCount,
  }),
});

// Errores por duck typing para no depender de las clases del SDK (ni del cliente falso).
function mapError(error) {
  if (error instanceof LlmError) return error;
  if (error?.name === 'APIConnectionTimeoutError') {
    return new LlmError('TIMEOUT', 'La API de Anthropic excedió el tiempo de espera', { retryable: true, cause: error });
  }
  if (typeof error?.status === 'number') {
    return new LlmError('PROVIDER', `La API de Anthropic respondió con estado ${error.status}: ${clip(error.message)}`, {
      retryable: isRetryableStatus(error.status),
      status: error.status,
      cause: error,
    });
  }
  // Error de red sin estado.
  return new LlmError('PROVIDER', `Falló la conexión con la API de Anthropic: ${clip(error?.message)}`, {
    retryable: true,
    cause: error,
  });
}

export function createAnthropicApiEngine({ apiKey, client }) {
  if (!client && !apiKey) {
    throw new LlmError('CONFIG', 'El motor api requiere ANTHROPIC_API_KEY');
  }
  // maxRetries 0: la política de reintentos es de quien llama (el SDK reintenta 2 veces por defecto).
  const sdk = client ?? new Anthropic({ apiKey, maxRetries: 0 });

  return {
    name: 'api',
    async generate({ system, messages, model, timeoutMs }) {
      let response;
      try {
        // Sin `tools` (la IA no ejecuta acciones) y sin `temperature` (pendiente).
        response = await sdk.messages.create(
          { model, max_tokens: MAX_TOKENS, system, messages },
          { timeout: timeoutMs },
        );
      } catch (error) {
        throw mapError(error);
      }

      const shape = responseSchema.safeParse(response);
      if (!shape.success) {
        throw new LlmError('INVALID_OUTPUT', 'La respuesta de la API de Anthropic no tiene el formato esperado');
      }
      const { content, stop_reason: stopReason, usage } = shape.data;

      if (stopReason === 'max_tokens') {
        throw new LlmError('INVALID_OUTPUT', 'La respuesta de la API de Anthropic se truncó (max_tokens)');
      }
      const text = content
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('')
        .trim();
      if (!text) throw new LlmError('INVALID_OUTPUT', 'La API de Anthropic no devolvió texto');

      return {
        text,
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreationInputTokens: usage.cache_creation_input_tokens,
          cacheReadInputTokens: usage.cache_read_input_tokens,
          costUsd: null,
        },
      };
    },
  };
}
