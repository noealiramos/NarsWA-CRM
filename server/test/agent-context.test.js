import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AGENTS } from '../src/agents/registry.js';
import { assertAgentContexts, buildSystem, createContextBuilder, parseKnowledge, sourceHash } from '../src/agents/context.js';
import { EMERGENCY_NOTICE, HANDOFF_NOTICE, MEDICAL_NOTICE } from '../src/agents/noticeTexts.js';
import { extractMonetaryAmounts } from '../src/agents/replyGuard.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (p) => readFileSync(p, 'utf8');
const now = new Date('2026-11-07T02:00:00Z');

describe('contexto fiel y acotado, incluso con agentes desconectados', () => {
  it('revisa explícitamente recepcion y ventas y no acepta un conjunto vacío', () => {
    const checked = assertAgentContexts(AGENTS, { now });
    expect(checked.length).toBeGreaterThan(0);
    expect(checked.map((a) => a.name)).toEqual(['recepcion', 'ventas']);
    expect(AGENTS.every((a) => a.connected === false)).toBe(true);
    expect(() => assertAgentContexts([])).toThrow(/No hay agentes/);
    expect(() => assertAgentContexts([{ name: 'incompleto' }])).toThrow(/contexto/);
  });

  it.each(AGENTS)('$name cabe, conserva límites antes de los datos, fuentes y textos fijos', (agent) => {
    const { hashes, knowledge } = parseKnowledge(read(agent.knowledge));
    const system = buildSystem(agent, { now });
    expect(system.length).toBeLessThanOrEqual(agent.maxSystemChars);
    expect(system.length).toBeLessThanOrEqual(24000);
    expect(knowledge.length).toBeLessThanOrEqual(agent.maxKnowledgeChars);
    expect(Object.keys(hashes).sort()).toEqual([...agent.sources].sort());
    for (const source of agent.sources) expect(hashes[source]).toBe(sourceHash(read(resolve(ROOT, source))));
    for (const fixed of [HANDOFF_NOTICE, EMERGENCY_NOTICE, MEDICAL_NOTICE]) expect(knowledge).toContain(fixed);
    for (const limit of ['Inventar precios', 'Dar descuentos', 'Confirmar pagos', 'consejos médicos']) {
      const index = system.indexOf(limit);
      expect(index, limit).toBeGreaterThanOrEqual(0);
      expect(index, limit).toBeLessThan(system.indexOf('## Base de conocimiento'));
    }
    expect(knowledge).toContain('[CONFIRMAR]');
    expect(system).not.toContain('CENTINELA-LEAD');
    expect(system).toContain('viernes 2026-11-06 (America/Mexico_City)');
  });

  it('los montos son de las fuentes y todos los precios de planes se conservan', () => {
    const sales = AGENTS.find((a) => a.name === 'ventas');
    const knowledge = parseKnowledge(read(sales.knowledge)).knowledge;
    const amounts = extractMonetaryAmounts(knowledge);
    const sources = new Set(extractMonetaryAmounts(sales.sources.map((p) => read(resolve(ROOT, p))).join('\n')));
    for (const amount of amounts) expect(sources.has(amount)).toBe(true);
    const catalog = read(resolve(ROOT, 'docs/negocio/catalogo.md'));
    const plans = catalog.slice(catalog.indexOf('## 3.'), catalog.indexOf('### 3.1'));
    for (const amount of extractMonetaryAmounts(plans)) expect(amounts).toContain(amount);
    expect(knowledge).toContain('Banco `[PENDIENTE]`');
    expect(knowledge).toContain('CLABE `[PENDIENTE]`');
    expect(knowledge).toContain('Titular `[PENDIENTE]`');
  });

  it('normaliza CRLF al calcular hashes', () => {
    expect(sourceHash('a\r\nb\r\n')).toBe(sourceHash('a\nb\n'));
  });

  it('detecta cambios de fuente aunque ya haya una entrada en caché', () => {
    const agent = AGENTS[0];
    let stale = false;
    const builder = createContextBuilder({ read: (path) => read(path) + (stale && path.endsWith('faq.md') ? '\nCambio' : '') });
    builder.buildSystem(agent, { now });
    stale = true;
    expect(() => builder.buildSystem(agent, { now })).toThrow(/desactualizado/);
  });

  it('rechaza sobrepresupuesto, hashes falsos, metadatos faltantes y no recorta', () => {
    const agent = AGENTS[0];
    expect(() => buildSystem({ ...agent, maxSystemChars: 100 }, { now })).toThrow(/presupuesto/);
    expect(() => buildSystem({ ...agent, maxKnowledgeChars: 1 }, { now })).toThrow(/presupuesto/);
    expect(() => buildSystem({ ...agent, sources: [] }, { now })).toThrow(/contexto/);
    expect(() => parseKnowledge('Sin encabezado')).toThrow(/Encabezado/);
    const builder = createContextBuilder({ read: (path) => path === agent.knowledge
      ? read(path).replace(/sha256:[a-f0-9]{64}/, `sha256:${'0'.repeat(64)}`) : read(path) });
    expect(() => builder.buildSystem(agent, { now })).toThrow(/desactualizado/);
  });

  it('la fecha cambia en medianoche de México y no en medianoche UTC', () => {
    const agent = AGENTS[0];
    expect(buildSystem(agent, { now: new Date('2026-11-07T05:59:59Z') })).toContain('2026-11-06');
    expect(buildSystem(agent, { now: new Date('2026-11-07T06:00:00Z') })).toContain('sábado 2026-11-07');
  });
});
