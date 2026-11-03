import { describe, expect, it, vi } from 'vitest';
import { config } from '../src/config/env.js';
import { LlmError, createLlm, generate } from '../src/llm/index.js';
import { MAX_SYSTEM_CHARS } from '../src/llm/schemas.js';

// createLlm y esquemas (ADR-004 §1 y §2) con motores falsos inyectados.
const goodUsage = { inputTokens: 1, outputTokens: 2, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, costUsd: null };

function fakeEngine(name, impl = async () => ({ text: ' respuesta ', usage: goodUsage })) {
  return { name, generate: vi.fn(impl) };
}

function setup(overrides = {}) {
  const cli = fakeEngine('cli');
  const api = fakeEngine('api');
  const factories = { cli: vi.fn(async () => cli), api: vi.fn(async () => api) };
  const llm = createLlm({ config, factories, warn: vi.fn(), ...overrides });
  return { cli, api, factories, llm };
}

const valid = { system: 'Eres el asistente.', messages: [{ role: 'user', content: 'hola' }] };

describe('createLlm: selección de motor', () => {
  it('usa el motor indicado y carga la fábrica solo en la primera llamada', async () => {
    const { api, cli, factories, llm } = setup({ engine: 'api' });
    expect(factories.api).not.toHaveBeenCalled();
    await llm.generate(valid);
    await llm.generate(valid);
    expect(api.generate).toHaveBeenCalledTimes(2);
    expect(cli.generate).not.toHaveBeenCalled();
    expect(factories.api).toHaveBeenCalledTimes(1);
    expect(factories.cli).not.toHaveBeenCalled();
  });

  it('usa config.LLM_ENGINE por defecto', async () => {
    const { cli, llm } = setup({ config: { ...config, LLM_ENGINE: 'cli' } });
    await llm.generate(valid);
    expect(cli.generate).toHaveBeenCalledTimes(1);
  });

  it('la instancia por defecto con un ejecutable inexistente falla con CONFIG', async () => {
    // Protege contra invocar el claude real: vitest.config.js debe apuntar a una ruta inexistente.
    expect(config.CLAUDE_CLI_PATH).toBe('claude-no-disponible-en-pruebas');
    expect(config.LLM_ENGINE).toBe('cli');
    await expect(generate(valid)).rejects.toMatchObject({ code: 'CONFIG' });
  });

  it('advierte una sola vez con cli en producción', async () => {
    const warn = vi.fn();
    const { llm } = setup({ config: { ...config, NODE_ENV: 'production' }, engine: 'cli', warn });
    await llm.generate(valid);
    await llm.generate(valid);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('generate: pipeline', () => {
  it('pasa al motor la entrada normalizada con los defaults', async () => {
    const { cli, llm } = setup({ engine: 'cli' });
    await llm.generate(valid);
    expect(cli.generate).toHaveBeenCalledWith({
      system: 'Eres el asistente.',
      messages: [{ role: 'user', content: 'hola' }],
      model: config.ANTHROPIC_MODEL_AGENTS,
      timeoutMs: 60000,
    });
  });

  it('respeta model y timeoutMs explícitos', async () => {
    const { cli, llm } = setup({ engine: 'cli' });
    await llm.generate({ ...valid, model: 'claude-haiku-5-5', timeoutMs: 5000 });
    expect(cli.generate.mock.calls[0][0]).toMatchObject({ model: 'claude-haiku-5-5', timeoutMs: 5000 });
  });

  it('fusiona mensajes consecutivos del mismo rol con salto doble', async () => {
    const { cli, llm } = setup({ engine: 'cli' });
    await llm.generate({
      system: 'S',
      messages: [
        { role: 'user', content: 'uno' },
        { role: 'user', content: 'dos' },
        { role: 'assistant', content: 'tres' },
        { role: 'assistant', content: 'cuatro' },
        { role: 'user', content: 'cinco' },
      ],
    });
    expect(cli.generate.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: 'uno\n\ndos' },
      { role: 'assistant', content: 'tres\n\ncuatro' },
      { role: 'user', content: 'cinco' },
    ]);
  });

  it('devuelve text con trim y usage con durationMs agregado por index', async () => {
    const { llm } = setup({ engine: 'cli' });
    const result = await llm.generate(valid);
    expect(result.text).toBe('respuesta');
    expect(result.usage).toEqual({ ...goodUsage, durationMs: expect.any(Number) });
    expect(result.usage.durationMs).toBeGreaterThanOrEqual(0);
  });

  it.each([
    ['texto vacío', { text: '  ', usage: goodUsage }],
    ['usage negativo', { text: 'hola', usage: { ...goodUsage, inputTokens: -1 } }],
    ['sin usage', { text: 'hola' }],
  ])('salida inválida del motor (%s) es INVALID_OUTPUT', async (_label, raw) => {
    const { llm } = setup({ engine: 'cli', factories: { cli: async () => fakeEngine('cli', async () => raw) } });
    await expect(llm.generate(valid)).rejects.toMatchObject({ code: 'INVALID_OUTPUT', retryable: false });
  });
});

describe('generate: entrada inválida', () => {
  const longSystem = 'x'.repeat(MAX_SYSTEM_CHARS + 1);
  const cases = [
    ['messages vacío', { ...valid, messages: [] }],
    ['más de 100 mensajes', { ...valid, messages: Array.from({ length: 101 }, () => ({ role: 'user', content: 'a' })) }],
    ['último mensaje assistant', { ...valid, messages: [...valid.messages, { role: 'assistant', content: 'x' }] }],
    ['primer mensaje assistant', { ...valid, messages: [{ role: 'assistant', content: 'x' }, ...valid.messages] }],
    ['contenido vacío', { ...valid, messages: [{ role: 'user', content: '   ' }] }],
    ['rol desconocido', { ...valid, messages: [{ role: 'system', content: 'x' }] }],
    ['system vacío', { ...valid, system: '  ' }],
    ['system demasiado largo', { ...valid, system: longSystem }],
    ['system con guion inicial', { ...valid, system: '--tools bash' }],
    ['model con guion inicial', { ...valid, model: '--model' }],
    ['model con espacios', { ...valid, model: 'claude sonnet' }],
    ['timeoutMs muy bajo', { ...valid, timeoutMs: 999 }],
    ['timeoutMs muy alto', { ...valid, timeoutMs: 300001 }],
    ['timeoutMs no entero', { ...valid, timeoutMs: 1500.5 }],
    ['sin entrada', undefined],
  ];

  it.each(cases)('%s es INPUT y no invoca el motor', async (_label, input) => {
    for (const engine of ['cli', 'api']) {
      const { factories, llm } = setup({ engine });
      await expect(llm.generate(input)).rejects.toMatchObject({ name: 'LlmError', code: 'INPUT', retryable: false });
      expect(factories[engine]).not.toHaveBeenCalled();
    }
  });

  it('acepta un system justo en el tope', async () => {
    const { llm } = setup({ engine: 'api' });
    await expect(llm.generate({ ...valid, system: 'x'.repeat(MAX_SYSTEM_CHARS) })).resolves.toBeDefined();
  });

  it('los errores de entrada no incluyen system ni texto del lead', async () => {
    const secret = 'CENTINELA-SECRETO-123';
    const { llm } = setup({ engine: 'cli' });
    const error = await llm
      .generate({ system: `-${secret}`, messages: [{ role: 'assistant', content: secret }] })
      .catch((e) => e);
    expect(error).toBeInstanceOf(LlmError);
    expect(error.message).not.toContain(secret);
  });
});
