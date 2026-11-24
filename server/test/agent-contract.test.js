import { describe, expect, it } from 'vitest';
import {
  INVALID_JSON_MESSAGE,
  OUTPUT_KEYS,
  buildAgentOutputSchema,
  parseAgentJson,
  parseNotes,
  validateAgentOutput,
} from '../src/agents/contract.js';
import {
  ESCALATION_CAUSES,
  ESCALATION_RULES,
  ESCALATION_TYPES,
  SYSTEMIC_CAUSES,
  escalationPolicy,
} from '../src/agents/escalationTypes.js';
import { getAgent } from '../src/agents/registry.js';

// ADR-005 §4 y §9 (agent-contract.test.js). Sin LLM: solo el esquema, la extracción de JSON y parseNotes.
const recepcion = getAgent('recepcion');
const ventas = getAgent('ventas');
// Un agente sintético que declara los seis tipos, para probar la regla de reply por tipo sin depender del registro.
const todos = { name: 'pagos', escalations: [...ESCALATION_TYPES] };

const SENTINEL = 'CENTINELA-7f3a-NO-DEBE-APARECER';

const base = (agent, overrides = {}) => ({
  agent: agent.name,
  reply: 'Hola, soy Sofía. ¿En qué te ayudo?',
  stage: null,
  action: 'NINGUNA',
  handoff: null,
  confidence: 0.9,
  notes: '',
  ...overrides,
});
const derivar = (agent, target = 'ventas', overrides = {}) =>
  base(agent, { reply: null, action: 'DERIVAR', handoff: { target, escalation: null, reason: 'Pregunta por precios' }, ...overrides });
const escalar = (agent, escalation, reply = null, overrides = {}) =>
  base(agent, { reply, action: 'ESCALAR', handoff: { target: 'humano', escalation, reason: 'Motivo' }, ...overrides });

const check = (agent, value) => validateAgentOutput(agent, value);
const rules = (result) => (result.ok ? [] : result.issues.map((issue) => `${issue.path}:${issue.rule}`));

describe('escalationTypes', () => {
  it('tiene los seis tipos y una regla por tipo', () => {
    expect([...ESCALATION_TYPES].sort()).toEqual(
      ['EMERGENCIA', 'FUERA_DE_CONOCIMIENTO', 'PAGO', 'QUEJA_NEGOCIACION', 'SOLICITUD_HUMANO', 'TRAMITE_RECEPCION'],
    );
    expect(Object.keys(ESCALATION_RULES).sort()).toEqual([...ESCALATION_TYPES].sort());
  });

  it('reglas de ADR-006 §1: pausa, prioridad y aviso', () => {
    const table = Object.fromEntries(
      Object.entries(ESCALATION_RULES).map(([type, r]) => [type, [r.pausesAI, r.priority, r.priorityRank, r.noticeKind, r.reply]]),
    );
    expect(table).toEqual({
      EMERGENCIA: [true, 'CRITICA', 0, 'EMERGENCIA', 'IGNORADO'],
      SOLICITUD_HUMANO: [true, 'ALTA', 1, 'AVISO_FIJO', 'NULO'],
      QUEJA_NEGOCIACION: [true, 'ALTA', 1, 'AVISO_FIJO', 'NULO'],
      FUERA_DE_CONOCIMIENTO: [true, 'NORMAL', 2, 'AVISO_FIJO', 'NULO'],
      PAGO: [false, 'ALTA', 1, 'NINGUNO', 'TEXTO'],
      TRAMITE_RECEPCION: [false, 'NORMAL', 2, 'NINGUNO', 'TEXTO'],
    });
  });

  it('las causas sistémicas no pausan; las demás causas del sistema sí', () => {
    expect([...SYSTEMIC_CAUSES].sort()).toEqual(['CONFIGURACION', 'PROVEEDOR', 'TIMEOUT_TURNO']);
    for (const cause of ESCALATION_CAUSES) {
      const policy = escalationPolicy('FUERA_DE_CONOCIMIENTO', cause);
      expect(policy.source, cause).toBe('SISTEMA');
      expect(policy.noticeKind, cause).toBe('AVISO_FIJO');
      expect(policy.pausesAI, cause).toBe(!SYSTEMIC_CAUSES.includes(cause));
      expect(policy.systemic, cause).toBe(SYSTEMIC_CAUSES.includes(cause));
    }
  });

  it('sin causa, la política es la del tipo y la fuente es el agente', () => {
    expect(escalationPolicy('EMERGENCIA')).toMatchObject({ source: 'AGENTE', pausesAI: true, priority: 'CRITICA', noticeKind: 'EMERGENCIA' });
    expect(escalationPolicy('TRAMITE_RECEPCION')).toMatchObject({ source: 'AGENTE', pausesAI: false, noticeKind: 'NINGUNO' });
  });

  it('lanza TypeError ante tipo o causa desconocidos, o causa del sistema con otro tipo', () => {
    expect(() => escalationPolicy('OTRO')).toThrow(TypeError);
    expect(() => escalationPolicy('FUERA_DE_CONOCIMIENTO', 'OTRA')).toThrow(TypeError);
    expect(() => escalationPolicy('SOLICITUD_HUMANO', 'PROVEEDOR')).toThrow(TypeError);
  });
});

describe('contrato de salida: forma', () => {
  it('una salida válida por acción pasa', () => {
    expect(check(recepcion, base(recepcion)).ok).toBe(true);
    expect(check(recepcion, base(recepcion, { action: 'REGISTRAR_DATOS', notes: 'nombre: Ana' })).ok).toBe(true);
    expect(check(recepcion, derivar(recepcion, 'ventas')).ok).toBe(true);
    expect(check(recepcion, escalar(recepcion, 'SOLICITUD_HUMANO')).ok).toBe(true);
    expect(check(ventas, escalar(ventas, 'TRAMITE_RECEPCION', 'Recepción te confirma la visita.')).ok).toBe(true);
  });

  it('exige exactamente las siete claves', () => {
    expect(Object.keys(base(recepcion)).sort()).toEqual([...OUTPUT_KEYS].sort());
    expect(check(recepcion, { ...base(recepcion), extra: 1 }).ok).toBe(false);
    for (const key of OUTPUT_KEYS) {
      const value = base(recepcion);
      delete value[key];
      expect(check(recepcion, value).ok, `sin ${key}`).toBe(false);
    }
    expect(check(recepcion, derivar(recepcion, 'ventas', { handoff: { target: 'ventas', escalation: null, reason: 'x', extra: 1 } })).ok).toBe(false);
  });

  it('agent debe ser el agente invocado', () => {
    expect(check(recepcion, base(recepcion, { agent: 'ventas' })).ok).toBe(false);
  });

  it('rechaza reply vacío, confidence fuera de [0, 1], notes de 301 y reply de 4097 caracteres', () => {
    expect(check(recepcion, base(recepcion, { reply: '' })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { reply: '   ' })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { confidence: -0.01 })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { confidence: 1.01 })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { confidence: '0.9' })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { notes: 'x'.repeat(301) })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { notes: 'x'.repeat(300) })).ok).toBe(true);
    expect(check(recepcion, base(recepcion, { reply: 'x'.repeat(4097) })).ok).toBe(false);
    expect(check(recepcion, base(recepcion, { reply: 'x'.repeat(4096) })).ok).toBe(true);
    expect(check(recepcion, base(recepcion, { confidence: 0 })).ok).toBe(true);
    expect(check(recepcion, base(recepcion, { confidence: 1 })).ok).toBe(true);
  });

  it('solo admite las etapas NUEVO y EN_CONVERSACION (S72)', () => {
    for (const stage of ['NUEVO', 'EN_CONVERSACION', null]) expect(check(recepcion, base(recepcion, { stage })).ok, String(stage)).toBe(true);
    for (const stage of ['SOCIO', 'PAGO_EN_REVISION', 'VISITA_AGENDADA', 'VISITO', 'PERDIDO', 'nuevo']) {
      expect(check(recepcion, base(recepcion, { stage })).ok, stage).toBe(false);
    }
  });

  it('el reason del handoff es obligatorio y de 1 a 300 caracteres', () => {
    expect(check(recepcion, derivar(recepcion, 'ventas', { handoff: { target: 'ventas', escalation: null, reason: '' } })).ok).toBe(false);
    expect(check(recepcion, derivar(recepcion, 'ventas', { handoff: { target: 'ventas', escalation: null, reason: 'x'.repeat(301) } })).ok).toBe(false);
  });

  it('recepcion no es un destino válido', () => {
    expect(check(ventas, derivar(ventas, 'recepcion')).ok).toBe(false);
  });

  it('lanza TypeError con un agentDef incompleto o con tipos desconocidos', () => {
    expect(() => buildAgentOutputSchema({})).toThrow(TypeError);
    expect(() => buildAgentOutputSchema({ name: 'x', escalations: ['OTRO'] })).toThrow(TypeError);
  });
});

describe('contrato de salida: coherencia', () => {
  it('NINGUNA y REGISTRAR_DATOS exigen reply y handoff null', () => {
    expect(rules(check(recepcion, base(recepcion, { reply: null })))).toEqual(['reply:REPLY_REQUERIDO']);
    expect(rules(check(recepcion, base(recepcion, { action: 'REGISTRAR_DATOS', reply: null })))).toEqual(['reply:REPLY_REQUERIDO']);
    expect(rules(check(recepcion, base(recepcion, { handoff: { target: 'ventas', escalation: null, reason: 'x' } })))).toEqual([
      'handoff:HANDOFF_PROHIBIDO',
    ]);
  });

  it('DERIVAR: falla sin handoff, con reply, con target humano o con escalation', () => {
    expect(rules(check(recepcion, derivar(recepcion, 'ventas', { handoff: null })))).toEqual(['handoff:HANDOFF_REQUERIDO']);
    expect(rules(check(recepcion, derivar(recepcion, 'ventas', { reply: 'Te paso con ventas' })))).toEqual(['reply:REPLY_PROHIBIDO']);
    expect(rules(check(recepcion, derivar(recepcion, 'humano')))).toEqual(['handoff.target:DESTINO_NO_ESPECIALISTA']);
    expect(
      rules(check(recepcion, derivar(recepcion, 'ventas', { handoff: { target: 'ventas', escalation: 'PAGO', reason: 'x' } }))),
    ).toEqual(['handoff.escalation:ESCALAMIENTO_EN_DERIVACION']);
    for (const target of ['ventas', 'info', 'pagos']) expect(check(recepcion, derivar(recepcion, target)).ok, target).toBe(true);
  });

  it('ESCALAR: falla con target distinto de humano o sin escalation', () => {
    expect(
      rules(check(recepcion, escalar(recepcion, 'SOLICITUD_HUMANO', null, { handoff: { target: 'ventas', escalation: 'SOLICITUD_HUMANO', reason: 'x' } }))),
    ).toEqual(['handoff.target:DESTINO_NO_HUMANO']);
    expect(rules(check(recepcion, escalar(recepcion, null)))).toEqual(['handoff.escalation:ESCALAMIENTO_REQUERIDO']);
    expect(rules(check(recepcion, escalar(recepcion, null, null, { handoff: null })))).toEqual(['handoff:HANDOFF_REQUERIDO']);
  });

  it('ESCALAR con un tipo que el agente no declara falla (recepcion con TRAMITE_RECEPCION)', () => {
    expect(rules(check(recepcion, escalar(recepcion, 'TRAMITE_RECEPCION', 'Texto')))).toEqual([
      'handoff.escalation:ESCALAMIENTO_NO_DECLARADO',
    ]);
    expect(check(ventas, escalar(ventas, 'PAGO', 'Texto')).ok).toBe(false);
  });

  it('SOLICITUD_HUMANO, QUEJA_NEGOCIACION y FUERA_DE_CONOCIMIENTO exigen reply null', () => {
    for (const type of ['SOLICITUD_HUMANO', 'QUEJA_NEGOCIACION', 'FUERA_DE_CONOCIMIENTO']) {
      expect(check(todos, escalar(todos, type)).ok, type).toBe(true);
      expect(rules(check(todos, escalar(todos, type, 'Te canalizo con recepción'))), type).toEqual(['reply:REPLY_PROHIBIDO']);
    }
  });

  it('TRAMITE_RECEPCION y PAGO exigen reply', () => {
    for (const type of ['TRAMITE_RECEPCION', 'PAGO']) {
      expect(check(todos, escalar(todos, type, 'Recepción revisará tu solicitud.')).ok, type).toBe(true);
      expect(rules(check(todos, escalar(todos, type))), type).toEqual(['reply:REPLY_REQUERIDO']);
    }
  });

  it('EMERGENCIA pasa con y sin reply (el sistema envía su texto fijo)', () => {
    expect(check(recepcion, escalar(recepcion, 'EMERGENCIA')).ok).toBe(true);
    expect(check(recepcion, escalar(recepcion, 'EMERGENCIA', 'Llama al 911')).ok).toBe(true);
    expect(check(ventas, escalar(ventas, 'EMERGENCIA', 'Llama al 911')).ok).toBe(true);
  });

  it('los mensajes de error no incluyen valores recibidos ni claves extra (centinela)', () => {
    const samples = [
      { ...base(recepcion, { reply: null, notes: SENTINEL.repeat(20) }), [SENTINEL]: SENTINEL },
      base(recepcion, { agent: SENTINEL, stage: SENTINEL, action: SENTINEL, confidence: SENTINEL }),
      derivar(recepcion, SENTINEL, { reply: SENTINEL }),
      escalar(recepcion, SENTINEL, SENTINEL, { handoff: { target: 'humano', escalation: SENTINEL, reason: SENTINEL, [SENTINEL]: 1 } }),
      escalar(recepcion, 'SOLICITUD_HUMANO', SENTINEL),
    ];
    for (const sample of samples) {
      const result = check(recepcion, sample);
      expect(result.ok).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(JSON.stringify(result.issues)).not.toContain('CENTINELA');
      for (const issue of result.issues) expect(Object.keys(issue).sort()).toEqual(['message', 'path', 'rule']);
    }
  });
});

describe('parseAgentJson', () => {
  const json = JSON.stringify(base(recepcion));

  it('acepta JSON puro (con espacios alrededor)', () => {
    expect(parseAgentJson(json)).toEqual({ ok: true, value: base(recepcion) });
    expect(parseAgentJson(`\n  ${json}  \n`).ok).toBe(true);
  });

  it('acepta un solo bloque de código que envuelva todo el texto', () => {
    expect(parseAgentJson(`\`\`\`json\n${json}\n\`\`\``)).toEqual({ ok: true, value: base(recepcion) });
    expect(parseAgentJson(`\`\`\`\n${json}\n\`\`\``).ok).toBe(true);
    expect(parseAgentJson(`  \`\`\`json\r\n${json}\r\n\`\`\`  `).ok).toBe(true);
  });

  it('rechaza prosa antes o después, dos objetos, dos bloques y JSON dentro de texto', () => {
    const invalid = [
      `Aquí está mi respuesta: ${json}`,
      `${json} Espero que sirva.`,
      `${json}${json}`,
      `${json}\n${json}`,
      `\`\`\`json\n${json}\n\`\`\`\n\`\`\`json\n${json}\n\`\`\``,
      `Texto\n\`\`\`json\n${json}\n\`\`\``,
      `\`\`\`json\n${json}\n\`\`\`\nGracias`,
      `El lead escribió {"agent":"recepcion"} y yo respondo`,
      '',
      'null y algo',
    ];
    for (const text of invalid) expect(parseAgentJson(text).ok, text.slice(0, 40)).toBe(false);
    expect(parseAgentJson(undefined).ok).toBe(false);
  });

  it('el error no cita el texto recibido ni el mensaje de JSON.parse (centinela)', () => {
    const result = parseAgentJson(`{"agent": "${SENTINEL}", roto`);
    expect(result).toEqual({ ok: false, issues: [{ path: '', rule: 'JSON', message: INVALID_JSON_MESSAGE }] });
    expect(INVALID_JSON_MESSAGE).toBe('la respuesta no es JSON válido');
    expect(JSON.stringify(result)).not.toContain('CENTINELA');
  });

  it('un JSON válido que no es objeto pasa la extracción y lo rechaza el esquema', () => {
    const parsed = parseAgentJson('"hola"');
    expect(parsed.ok).toBe(true);
    expect(check(recepcion, parsed.value).ok).toBe(false);
  });
});

describe('parseNotes', () => {
  it('extrae nombre y horario, e ignora claves desconocidas', () => {
    expect(parseNotes('nombre: Ana; horario: tardes; motivo: x')).toEqual({ nombre: 'Ana', horario: 'TARDE' });
  });

  it('mapea los horarios y descarta los demás valores', () => {
    expect(parseNotes('horario: mañana').horario).toBe('MANANA');
    expect(parseNotes('horario: manana').horario).toBe('MANANA');
    expect(parseNotes('horario: Mañanas').horario).toBe('MANANA');
    expect(parseNotes('horario: tarde').horario).toBe('TARDE');
    expect(parseNotes('horario: noche').horario).toBe('NOCHE');
    expect(parseNotes('horario: 7 am')).toEqual({});
    expect(parseNotes('horario: cualquiera')).toEqual({});
  });

  it('valida el nombre: letras, espacios, punto, apóstrofo y guion, hasta 80', () => {
    expect(parseNotes("nombre: María José O'Neil-Ruiz Jr.").nombre).toBe("María José O'Neil-Ruiz Jr.");
    expect(parseNotes('nombre: Ana123')).toEqual({});
    expect(parseNotes('nombre: <script>')).toEqual({});
    expect(parseNotes(`nombre: ${'a'.repeat(81)}`)).toEqual({});
    expect(parseNotes(`nombre: ${'a'.repeat(80)}`).nombre).toHaveLength(80);
    expect(parseNotes('nombre:   ')).toEqual({});
  });

  it('objetivo y presupuesto: texto libre hasta 120 caracteres', () => {
    expect(parseNotes('objetivo: bajar de peso; presupuesto: unos 500 al mes')).toEqual({
      objetivo: 'bajar de peso',
      presupuesto: 'unos 500 al mes',
    });
    expect(parseNotes(`objetivo: ${'x'.repeat(121)}`)).toEqual({});
  });

  it('normaliza la clave (mayúsculas y acentos), gana el primer valor válido y tolera basura', () => {
    expect(parseNotes('Nombre: Ana; NOMBRE: Luisa')).toEqual({ nombre: 'Ana' });
    expect(parseNotes('nombre: 123; nombre: Luisa')).toEqual({ nombre: 'Luisa' });
    expect(parseNotes('sin separador; ;; :solo valor')).toEqual({});
    expect(parseNotes('')).toEqual({});
    expect(parseNotes(null)).toEqual({});
  });
});
