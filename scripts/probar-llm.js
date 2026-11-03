// Prueba manual de la capa LLM (ADR-004): manda "hola" por el motor activo (LLM_ENGINE) y muestra motor,
// modelo, texto y tiempo. Hace UNA llamada real: con el motor `cli` gasta cuota de la suscripción de Claude
// Code y con `api` cuesta tokens. No toca MongoDB ni WhatsApp. Uso: npm run probar-llm
import { config } from '../server/src/config/env.js';
import { generate } from '../server/src/llm/index.js';

const SYSTEM = 'Responde en una frase corta en español de México.';
const model = config.ANTHROPIC_MODEL_AGENTS;

console.log(`Motor: ${config.LLM_ENGINE} · Modelo: ${model}`);
if (config.LLM_ENGINE === 'cli') {
  console.warn(
    'Aviso: el motor cli es solo para desarrollo; producción debe usar LLM_ENGINE=api (ADR-004, §Alcance).',
  );
}

const started = performance.now();
try {
  const { text, usage } = await generate({ system: SYSTEM, messages: [{ role: 'user', content: 'hola' }], model });
  const elapsedMs = Math.round(performance.now() - started);
  console.log(`Texto: ${text}`);
  console.log(`Tiempo: ${elapsedMs} ms (tokens: ${usage.inputTokens} entrada, ${usage.outputTokens} salida)`);
} catch (err) {
  // Solo código y mensaje: nunca el prompt ni la conversación.
  console.error(`Falló (${err.code ?? 'ERROR'}): ${err.message}`);
  process.exitCode = 1;
}
