import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ESCALATION_TYPES } from '../src/agents/escalationTypes.js';
import { AGENTS, getAgent } from '../src/agents/registry.js';
import { EMERGENCY_NOTICE } from '../src/agents/noticeTexts.js';
import { caseSchema, parseConversationCases } from './helpers/conversationCases.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const REGISTRY_FILE = fileURLToPath(new URL('../src/agents/registry.js', import.meta.url));
const CASES_DIR = fileURLToPath(new URL('./conversaciones/', import.meta.url));

// Catálogo único de tipos (ADR-006 §1): mismos seis tipos que la lista local que reemplaza.
const ESCALATIONS = ESCALATION_TYPES;
const CONTRACT_KEYS = ['agent', 'reply', 'stage', 'action', 'handoff', 'confidence', 'notes'];
const SPECIALISTS = ['ventas', 'info', 'pagos'];
const PESOS = /\$\s?\d/;
const CHANNEL_REFS = /channels\/|outbox\//;

// Esquema compartido con el futuro runner. Aquí solo se validan los datos.

const read = (path) => readFileSync(path, 'utf8');
const loadCases = (name) => JSON.parse(read(join(CASES_DIR, `${name}.json`)));

describe('registro de agentes', () => {
  it('tiene recepcion y ventas, con nombres únicos en minúsculas sin acentos', () => {
    const names = AGENTS.map((agent) => agent.name);
    expect(names).toEqual(expect.arrayContaining(['recepcion', 'ventas']));
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z]+$/);
  });

  it('getAgent devuelve el agente por nombre', () => {
    expect(getAgent('ventas')?.name).toBe('ventas');
    expect(getAgent('no-existe')).toBeUndefined();
  });

  it('recepcion declara que equivale al router del PRD', () => {
    expect(getAgent('recepcion').label).toBe('Recepcionista');
    expect(getAgent('recepcion').description).toMatch(/Router/);
  });

  it('registry.js no importa ni menciona channels/ ni outbox/', () => {
    expect(read(REGISTRY_FILE)).not.toMatch(CHANNEL_REFS);
  });
});

describe.each(AGENTS.map((agent) => [agent.name, agent]))('agente %s', (name, agent) => {
  const prompt = existsSync(agent.promptPath) ? read(agent.promptPath) : '';

  it('tiene todos los campos del registro y connected en false', () => {
    expect(agent.label).toBeTruthy();
    expect(agent.description).toBeTruthy();
    expect(agent.connected).toBe(false);
  });

  it('su prompt existe y no deja marcadores sin llenar', () => {
    expect(existsSync(agent.promptPath)).toBe(true);
    expect(prompt).not.toContain('{{');
    expect(prompt).not.toContain('}}');
  });

  it('su prompt menciona el agente y las siete claves del contrato', () => {
    expect(prompt).toContain(`"agent": "${name}"`);
    for (const key of CONTRACT_KEYS) expect(prompt).toContain(`"${key}"`);
  });

  it('su prompt no tiene cifras en pesos ni referencias a channels/ u outbox/', () => {
    expect(prompt).not.toMatch(PESOS);
    expect(prompt).not.toMatch(CHANNEL_REFS);
  });

  it('su prompt solo ofrece etapas permitidas en el contrato', () => {
    expect(prompt).toMatch(/Nunca otra etapa/);
  });

  it('sus fuentes existen y están listadas en el prompt', () => {
    expect(agent.sources.length).toBeGreaterThan(0);
    for (const source of agent.sources) {
      expect(existsSync(join(ROOT, source))).toBe(true);
      expect(prompt).toContain(source);
    }
  });

  it('solo declara tipos de escalamiento válidos, y su prompt los explica', () => {
    expect(agent.escalations.length).toBeGreaterThan(0);
    for (const type of agent.escalations) {
      expect(ESCALATIONS).toContain(type);
      expect(prompt).toContain(`\`${type}\``);
    }
  });

  describe('casos de conversación', () => {
    const file = join(CASES_DIR, `${name}.json`);

    it('el archivo existe y es un arreglo de al menos 5 casos válidos con ids únicos', () => {
      expect(existsSync(file)).toBe(true);
      const cases = loadCases(name);
      expect(Array.isArray(cases)).toBe(true);
      expect(cases.length).toBeGreaterThanOrEqual(5);
      const parsed = z.array(caseSchema).safeParse(cases);
      expect(parsed.error?.issues).toBeUndefined();
      const ids = cases.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('son coherentes con el contrato de salida', () => {
      for (const { id, expect: exp } of loadCases(name)) {
        const label = `caso ${id}`;
        if (exp.action === 'DERIVAR') {
          expect(SPECIALISTS, label).toContain(exp.handoffTarget);
          expect(exp.escalation, label).toBeNull();
          expect(exp.replyNull, label).toBe(true);
        } else if (exp.action === 'ESCALAR') {
          expect(exp.handoffTarget, label).toBe('humano');
          expect(exp.escalation, label).not.toBeNull();
          expect(agent.escalations, label).toContain(exp.escalation);
        } else {
          expect(exp.handoffTarget, label).toBeNull();
          expect(exp.escalation, label).toBeNull();
        }
      }
    });

    it('ningún caso contiene cifras en pesos en sus mensajes', () => {
      for (const item of loadCases(name)) {
        for (const message of item.messages) expect(message.content, item.id).not.toMatch(PESOS);
      }
    });

    it('hay un caso por cada tipo de escalamiento declarado', () => {
      const cases = loadCases(name);
      for (const type of agent.escalations) {
        expect(
          cases.some((item) => item.expect.escalation === type),
          `falta un caso para ${type}`,
        ).toBe(true);
      }
    });
  });
});

describe('agente recepcion: solo responde saludos y emergencias', () => {
  const cases = loadCases('recepcion');

  it('tiene al menos un caso con respuesta (el saludo)', () => {
    expect(cases.some((item) => item.expect.replyNull === false)).toBe(true);
  });

  it('las derivaciones y escalamientos responden null; emergencia usa el aviso del sistema', () => {
    for (const item of cases) {
      if (item.expect.escalation === 'EMERGENCIA') {
        expect(item.expect.replyNull, item.id).toBe(true);
        expect(item.expect.noticeKind, item.id).toBe('EMERGENCIA');
      } else if (item.expect.action === 'DERIVAR' || item.expect.action === 'ESCALAR') {
        expect(item.expect.replyNull, item.id).toBe(true);
      }
    }
    // Con respuesta del agente: solo saludos. El aviso del 911 es del sistema.
    const withReply = cases.filter((item) => !item.expect.replyNull);
    expect(withReply.map((item) => item.id).sort()).toEqual(['saludo-con-nombre', 'saludo-simple']);
  });

  it('REGISTRAR_DATOS solo va con saludo, así que siempre lleva respuesta', () => {
    const registering = cases.filter((item) => item.expect.action === 'REGISTRAR_DATOS');
    expect(registering.length).toBeGreaterThan(0);
    for (const item of registering) expect(item.expect.replyNull, item.id).toBe(false);
  });

  it('su prompt copia literal el texto de emergencia del playbook §6', () => {
    const playbook = read(join(ROOT, 'docs/negocio/playbook-ventas.md'));
    const fixed = playbook.match(/> "(Si estás ante una emergencia médica[^"]+)"/)?.[1];
    expect(fixed).toBeTruthy();
    expect(read(getAgent('recepcion').promptPath)).toContain(fixed);
  });
});

describe('agente ventas', () => {
  const prompt = read(getAgent('ventas').promptPath);

  it('sus fuentes son solo catalogo y playbook', () => {
    expect(getAgent('ventas').sources).toEqual(['docs/negocio/catalogo.md', 'docs/negocio/playbook-ventas.md']);
  });

  it('no declara PAGO: solo deriva a pagos, y hay un caso que lo hace', () => {
    expect(getAgent('ventas').escalations).not.toContain('PAGO');
    expect(loadCases('ventas').some((item) => item.expect.action === 'DERIVAR' && item.expect.handoffTarget === 'pagos')).toBe(true);
  });

  it('da el mensaje médico del playbook §8.4 textualmente', () => {
    expect(prompt).toContain('§8.4');
    expect(prompt).toContain('§8.4 **textualmente**');
  });

  it('copia literal el texto de emergencia del playbook §6', () => {
    const playbook = read(join(ROOT, 'docs/negocio/playbook-ventas.md'));
    const fixed = playbook.match(/> "(Si estás ante una emergencia médica[^"]+)"/)?.[1];
    expect(fixed).toBeTruthy();
    expect(prompt).toContain(fixed);
  });
});

// Las regex viven en archivos JSON, donde un escape mal puesto (`\b`, `d+`) cambia el significado sin avisar.
describe('regex de los casos de conversación', () => {
  const allRegexes = ['recepcion', 'ventas', 'integracion'].flatMap((name) =>
    loadCases(name).flatMap((item) =>
      [...item.expect.mustMatch, ...item.expect.mustNotMatch, ...(item.expect.noticeMustMatch ?? [])]
        .map((source) => ({ id: `${name}/${item.id}`, source })),
    ),
  );

  it('valida integracion.json, sus cuatro ids y claves únicas de los tres archivos', () => {
    const cases = loadCases('integracion');
    expect(parseConversationCases(cases, { integration: true })).toHaveLength(4);
    expect(cases.map((item) => item.id).sort()).toEqual([
      'precios-traspaso-a-ventas', 'pide-persona-escala-sin-traspaso',
      'ya-pague-destino-pagos-inexistente', 'pregunta-de-horarios-destino-info-inexistente',
    ].sort());
    const keys = ['recepcion', 'ventas', 'integracion'].flatMap((name) =>
      parseConversationCases(loadCases(name)).map((item) => `${name}/${item.id}`));
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of cases) for (const message of item.messages) expect(message.content).not.toMatch(PESOS);
  });

  it('las expectativas del aviso de emergencia casan con el texto fijo', () => {
    for (const name of ['recepcion', 'ventas']) {
      const emergency = loadCases(name).find((item) => item.expect.escalation === 'EMERGENCIA');
      expect(emergency.expect.mustMatch).toEqual([]);
      expect(emergency.expect.noticeMustMatch.length).toBeGreaterThan(0);
      for (const source of emergency.expect.noticeMustMatch) expect(EMERGENCY_NOTICE).toMatch(new RegExp(source, 'i'));
    }
  });

  it('ninguna contiene caracteres de control (señal de un escape mal escrito en el JSON)', () => {
    for (const { id, source } of allRegexes) {
      // eslint-disable-next-line no-control-regex
      expect(/[\u0000-\u001f]/.test(source), `${id}: ${JSON.stringify(source)}`).toBe(false);
    }
  });

  // Regex de límites duros: cada una debe aparecer tal cual en ventas.json y comportarse con estos ejemplos.
  const HARD_LIMITS = [
    {
      name: 'porcentaje',
      source: '\\d+\\s?%',
      matches: ['10%', 'Tienes 20 % menos'],
      misses: ['Mensual', 'dd%'],
    },
    {
      name: 'oferta de descuento',
      source:
        '(?<!no )(te (doy|ofrezco|hago|aplico)|hay|tenemos|ofrecemos|contamos con|puedo (darte|ofrecerte)) (un |una |algún |alguna )?(descuento|rebaja|promoci[oó]n|oferta)|tienes .{0,20}% de descuento',
      matches: [
        'Te doy un descuento',
        'Tenemos una promoción',
        'Ofrecemos descuentos',
        'Puedo ofrecerte un descuento',
        'Hoy tienes un 10% de descuento',
      ],
      misses: [
        'No puedo dar descuentos',
        'No hay descuentos',
        'No tenemos ningún descuento',
        'No hay promociones temporales activas',
        'No contamos con promociones',
        'No puedo ofrecerte descuentos',
      ],
    },
    {
      name: 'edad',
      source: '\\bedad\\b',
      matches: ['¿Cuál es tu edad?', 'Edad'],
      misses: ['Qué sociedad tan sana'],
    },
    {
      name: 'visita confirmada',
      source: '(?<!no )(queda|qued[oó]|est[aá]) confirmad[oa]',
      matches: ['Tu visita queda confirmada', 'Ya quedó confirmado'],
      misses: ['Tu visita aún no está confirmada', 'Recepción debe confirmarla'],
    },
  ];

  it.each(HARD_LIMITS.map((limit) => [limit.name, limit]))('la regex de %s se comporta con ejemplos', (_name, limit) => {
    const regex = new RegExp(limit.source, 'i');
    for (const text of limit.matches) expect(regex.test(text), `debe casar: ${text}`).toBe(true);
    for (const text of limit.misses) expect(regex.test(text), `no debe casar: ${text}`).toBe(false);
  });

  it('las regex de límites duros están en los casos de ventas tal cual', () => {
    const used = new Set(allRegexes.filter((item) => item.id.startsWith('ventas/')).map((item) => item.source));
    for (const limit of HARD_LIMITS) expect(used.has(limit.source), limit.name).toBe(true);
  });
});
