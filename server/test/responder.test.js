import { describe, expect, it } from 'vitest';
import { provisionalReply } from '../src/agents/provisionalResponder.js';

// Límites duros (CLAUDE.md y PRD §3.1) aplicados al respondedor provisional.
const replies = [provisionalReply({ isFirstMessage: true }), provisionalReply({ isFirstMessage: false })];

describe('respondedor provisional', () => {
  it('es determinista', () => {
    expect(provisionalReply({ isFirstMessage: true })).toBe(replies[0]);
  });

  it.each(replies)('no menciona precios ni cantidades: %s', (reply) => {
    expect(reply).not.toMatch(/\$|\d|precio|costo|mxn|pesos/i);
  });

  it.each(replies)('no confirma pagos ni ofrece descuentos: %s', (reply) => {
    expect(reply).not.toMatch(/pago|confirmad|descuento|promoci/i);
  });

  it.each(replies)('no da consejos médicos ni de nutrición: %s', (reply) => {
    expect(reply).not.toMatch(/dieta|lesi[oó]n|suplement|m[eé]dic/i);
  });
});
