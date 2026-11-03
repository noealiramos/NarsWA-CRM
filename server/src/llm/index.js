import { performance } from 'node:perf_hooks';
import { cliChildEnv, config as defaultConfig } from '../config/env.js';
import { LlmError } from './errors.js';
import { DEFAULT_TIMEOUT_MS, describeIssues, engineOutputSchema, parseInput } from './schemas.js';

export { LlmError } from './errors.js';

// Capa única de acceso al LLM (ADR-004). Pipeline: validar -> normalizar -> motor -> validar
// salida -> medir tiempo. No tiene efectos secundarios, así que reintentar es seguro.
// Los motores se cargan con import() dinámico: con `cli` no se carga el SDK de Anthropic.

function defaultFactories(config) {
  return {
    async cli() {
      const { createClaudeCliEngine } = await import('./claudeCli.js');
      return createClaudeCliEngine({ cliPath: config.CLAUDE_CLI_PATH, env: cliChildEnv() });
    },
    async api() {
      const { createAnthropicApiEngine } = await import('./anthropicApi.js');
      return createAnthropicApiEngine({ apiKey: config.ANTHROPIC_API_KEY });
    },
  };
}

// `factories` ({ cli, api }: funciones async que devuelven un motor) permite inyectar motores en pruebas.
export function createLlm({
  engine,
  config = defaultConfig,
  factories = defaultFactories(config),
  warn = console.warn,
} = {}) {
  const engineName = engine ?? config.LLM_ENGINE;
  let enginePromise;

  async function loadEngine() {
    if (!enginePromise) {
      const factory = factories[engineName];
      if (!factory) throw new LlmError('CONFIG', `Motor LLM desconocido: ${engineName}`);
      if (engineName === 'cli' && config.NODE_ENV === 'production') {
        warn('[llm] LLM_ENGINE=cli en producción: el CLI es solo para desarrollo; usa LLM_ENGINE=api.');
      }
      enginePromise = factory();
    }
    try {
      return await enginePromise;
    } catch (error) {
      // Si la carga falla se permite reintentar en la siguiente llamada.
      enginePromise = undefined;
      throw error;
    }
  }

  async function generate(input) {
    const parsed = parseInput(input);
    const model = parsed.model ?? config.ANTHROPIC_MODEL_AGENTS;
    const timeoutMs = parsed.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const llmEngine = await loadEngine();
    const startedAt = performance.now();
    const raw = await llmEngine.generate({ system: parsed.system, messages: parsed.messages, model, timeoutMs });
    const durationMs = Math.round(performance.now() - startedAt);

    const output = engineOutputSchema.safeParse(raw);
    if (!output.success) {
      throw new LlmError('INVALID_OUTPUT', `Salida inválida del motor ${llmEngine.name}: ${describeIssues(output.error)}`);
    }
    return { text: output.data.text, usage: { ...output.data.usage, durationMs } };
  }

  return { engine: engineName, generate };
}

// Instancia por defecto, según LLM_ENGINE.
const llm = createLlm();
export const generate = (input) => llm.generate(input);
