import { describe, expect, it, vi } from 'vitest';
import { createAnthropicApiEngine } from '../src/llm/anthropicApi.js';

// Motor api (ADR-004 §4) con un cliente falso del SDK: sin red ni clave real.
const fakeClient = (impl) => ({ messages: { create: vi.fn(impl) } });
const okResponse = (overrides = {}) => ({
  content: [{ type: 'text', text: 'Hola ' }, { type: 'tool_use', id: 'x' }, { type: 'text', text: 'mundo  ' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 7, output_tokens: 3, cache_creation_input_tokens: null, cache_read_input_tokens: null },
  ...overrides,
});

const input = {
  system: 'Eres el asistente.',
  messages: [{ role: 'user', content: 'hola' }],
  model: 'claude-sonnet-5-5',
  timeoutMs: 15000,
};

describe('motor api', () => {
  it('envía los parámetros esperados y nunca tools', async () => {
    const client = fakeClient(async () => okResponse());
    await createAnthropicApiEngine({ client }).generate(input);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
    const [body, options] = client.messages.create.mock.calls[0];
    expect(body).toEqual({
      model: 'claude-sonnet-5-5',
      max_tokens: 1024,
      system: 'Eres el asistente.',
      messages: [{ role: 'user', content: 'hola' }],
    });
    expect(body).not.toHaveProperty('tools');
    expect(options).toEqual({ timeout: 15000 });
  });

  it('une los bloques de texto y normaliza usage (caché null a 0, costUsd null)', async () => {
    const client = fakeClient(async () => okResponse());
    const result = await createAnthropicApiEngine({ client }).generate(input);
    expect(result.text).toBe('Hola mundo');
    expect(result.usage).toEqual({
      inputTokens: 7,
      outputTokens: 3,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      costUsd: null,
    });
  });

  it('truncado o sin texto es INVALID_OUTPUT', async () => {
    const truncated = fakeClient(async () => okResponse({ stop_reason: 'max_tokens' }));
    await expect(createAnthropicApiEngine({ client: truncated }).generate(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
      retryable: false,
    });
    const noText = fakeClient(async () => okResponse({ content: [{ type: 'tool_use', id: 'x' }] }));
    await expect(createAnthropicApiEngine({ client: noText }).generate(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
    const malformed = fakeClient(async () => ({ nada: true }));
    await expect(createAnthropicApiEngine({ client: malformed }).generate(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
  });

  it('errores con estado: 429 reintentable, 401 no, 500 sí', async () => {
    const failWith = (status) =>
      createAnthropicApiEngine({
        client: fakeClient(async () => {
          throw Object.assign(new Error('falló'), { status });
        }),
      }).generate(input);
    await expect(failWith(429)).rejects.toMatchObject({ code: 'PROVIDER', retryable: true, status: 429 });
    await expect(failWith(401)).rejects.toMatchObject({ code: 'PROVIDER', retryable: false });
    await expect(failWith(403)).rejects.toMatchObject({ code: 'PROVIDER', retryable: false });
    await expect(failWith(500)).rejects.toMatchObject({ code: 'PROVIDER', retryable: true });
  });

  it('APIConnectionTimeoutError es TIMEOUT y un error de red sin estado es PROVIDER reintentable', async () => {
    const timeout = fakeClient(async () => {
      throw Object.assign(new Error('timeout'), { name: 'APIConnectionTimeoutError' });
    });
    await expect(createAnthropicApiEngine({ client: timeout }).generate(input)).rejects.toMatchObject({
      code: 'TIMEOUT',
      retryable: true,
    });
    const network = fakeClient(async () => {
      throw new Error('ECONNRESET');
    });
    await expect(createAnthropicApiEngine({ client: network }).generate(input)).rejects.toMatchObject({
      code: 'PROVIDER',
      retryable: true,
    });
  });

  it('sin client ni clave es CONFIG', () => {
    expect(() => createAnthropicApiEngine({})).toThrow(expect.objectContaining({ code: 'CONFIG', retryable: false }));
  });

  it('el mensaje de error no incluye system ni texto del lead', async () => {
    const secret = 'CENTINELA-SECRETO-123';
    const client = fakeClient(async () => {
      throw Object.assign(new Error('estado raro'), { status: 400 });
    });
    const error = await createAnthropicApiEngine({ client })
      .generate({ ...input, system: secret, messages: [{ role: 'user', content: secret }] })
      .catch((e) => e);
    expect(error.message).not.toContain(secret);
  });
});
