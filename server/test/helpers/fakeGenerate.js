// Motor guionado sin red: si falta un paso falla, nunca recurre al proveedor real.
export function agentJson(overrides = {}) {
  return JSON.stringify({ agent: 'recepcion', reply: 'Hola, soy Sofía. ¿Cómo te llamas?',
    stage: null, action: 'NINGUNA', handoff: null, confidence: 0.9, notes: '', ...overrides });
}

export function createFakeGenerate(script) {
  const calls = [];
  const generate = async (input) => {
    calls.push(structuredClone(input));
    const index = calls.length - 1;
    if (index >= script.length) throw new Error('Guion falso agotado');
    const step = script[index];
    const value = typeof step === 'function' ? await step(input) : step;
    if (value instanceof Error) throw value;
    return typeof value === 'string' ? { text: value, usage: { inputTokens: 1, outputTokens: 1,
      cacheCreationInputTokens: 0, cacheReadInputTokens: 0, costUsd: null, durationMs: 0 } } : value;
  };
  return { generate, calls };
}
