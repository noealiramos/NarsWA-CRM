import { describe, expect, it } from 'vitest';
import { normalizeHistory, HISTORY_START_NOTE } from '../src/agents/history.js';
import { parseInput } from '../src/llm/schemas.js';

describe('normalización de historial compartida por QA y orquestador', () => {
  it('antepone la nota sintética y pasa el contrato LLM sin modificar la entrada', () => {
    const input = [{ role: 'assistant', content: '¿Qué buscas?' }, { role: 'user', content: 'Fuerza' }];
    const normalized = normalizeHistory(input);
    expect(normalized[0]).toEqual({ role: 'user', content: HISTORY_START_NOTE });
    expect(input).toHaveLength(2);
    expect(parseInput({ system: 'Sistema de prueba', messages: normalized }).messages).toEqual(normalized);
  });
  it('conserva los últimos 20 turnos y añade la nota solo si hace falta', () => {
    const input = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `${i}` }));
    const normalized = normalizeHistory(input);
    expect(normalized).toHaveLength(21);
    expect(normalized[1].content).toBe('5');
    expect(normalized.at(-1).content).toBe('24');
  });
  it('no fusiona ni duplica: la fusión de roles consecutivos corresponde al LLM', () => {
    const input = [{ role: 'user', content: ' hola ' }, { role: 'user', content: 'Quiero precios' }];
    expect(normalizeHistory(input)).toEqual([{ role: 'user', content: 'hola' }, input[1]]);
    expect(parseInput({ system: 'Sistema', messages: normalizeHistory(input) }).messages)
      .toEqual([{ role: 'user', content: 'hola\n\nQuiero precios' }]);
  });
  it.each([[], undefined, [{ role: 'assistant', content: 'Hola' }], [{ role: 'system', content: 'x' }],
    [{ role: 'user', content: ' ' }], [{ role: 'user', content: '\0' }]])('rechaza historial inválido %j sin citar su contenido', (input) => {
    expect(() => normalizeHistory(input)).toThrow(TypeError);
  });
});
