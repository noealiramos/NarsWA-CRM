import { describe, expect, it, vi } from 'vitest';

// El SDK se reemplaza para inspeccionar cómo lo construye el motor api (ADR-004 §4).
const constructed = vi.hoisted(() => []);
vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    constructor(options) {
      constructed.push(options);
      this.messages = { create: vi.fn() };
    }
  },
}));

const { createAnthropicApiEngine } = await import('../src/llm/anthropicApi.js');

describe('motor api: construcción del SDK', () => {
  it('desactiva los reintentos del SDK (la política es de quien llama)', () => {
    createAnthropicApiEngine({ apiKey: 'sk-prueba' });
    expect(constructed).toEqual([{ apiKey: 'sk-prueba', maxRetries: 0 }]);
  });
});
