import { describe, expect, it } from 'vitest';
import { runAgentTurn } from '../src/agents/orchestrator.js';
import { AGENTS } from '../src/agents/registry.js';
import { EMERGENCY_NOTICE, MEDICAL_NOTICE } from '../src/agents/noticeTexts.js';
import { LlmError } from '../src/llm/errors.js';
import { createFakeGenerate, agentJson } from './helpers/fakeGenerate.js';

const messages = [{ role: 'user', content: 'Hola, ¿cuánto cuesta? CENTINELA-LEAD' }];
const agents = AGENTS.map((a) => ({ ...a, connected: true }));
const route = (target = 'ventas') => agentJson({ reply: null, action: 'DERIVAR',
  handoff: { target, escalation: null, reason: 'Tema del especialista' } });
const sale = (extra = {}) => agentJson({ agent: 'ventas', reply: 'El Mensual cuesta $499.', ...extra });
const escalation = (type, extra = {}) => agentJson({ reply: null, action: 'ESCALAR',
  handoff: { target: 'humano', escalation: type, reason: 'Petición del lead' }, ...extra });
const timeout = () => new LlmError('TIMEOUT', 'CENTINELA-ERROR', { retryable: true });
async function run(script, options = {}) {
  const fake = createFakeGenerate(script);
  const result = await runAgentTurn({ messages, ...options,
    deps: { agents, generate: fake.generate, sleep: async () => {}, ...options.deps } });
  return { result, calls: fake.calls };
}

describe('orquestador sin efectos con LLM falso', () => {
  it('deriva y responde en el mismo turno con el mismo historial y modelos distintos', async () => {
    const { result, calls } = await run([route(), sale({ stage: 'EN_CONVERSACION', notes: 'nombre: Ana; horario: tardes' })]);
    expect(result).toMatchObject({ kind: 'RESPUESTA', agent: 'ventas', trail: ['recepcion', 'ventas'],
      escalation: null, captured: { nombre: 'Ana', horario: 'TARDE' },
      stage: { proposed: 'EN_CONVERSACION', applied: false } });
    expect(calls).toHaveLength(2);
    expect(calls[0].messages).toEqual(calls[1].messages);
    expect(calls[0].model).not.toBe(calls[1].model);
    expect(result.usage).toHaveLength(2);
    for (const call of calls) {
      expect(call.system).not.toContain('CENTINELA-LEAD');
      expect(call.system.length).toBeLessThan(24000);
      expect(call.timeoutMs).toBeLessThanOrEqual(45000);
    }
  });

  it('un saludo no llama a otro agente y el modo aislado devuelve la derivación', async () => {
    expect((await run([agentJson()])).calls).toHaveLength(1);
    const { result, calls } = await run([route()], { followHandoffs: false });
    expect(result).toMatchObject({ kind: 'DERIVACION', reply: null, escalation: null });
    expect(calls).toHaveLength(1);
  });

  it('los agentes desconectados no se invocan; los destinos faltantes son visibles', async () => {
    const disconnected = await run([], { deps: { agents: AGENTS } });
    expect(disconnected.calls).toHaveLength(0);
    expect(disconnected.result.escalation.cause).toBe('DESTINO_INEXISTENTE');
    for (const target of ['info', 'pagos']) {
      const { result } = await run([route(target)]);
      expect(result.escalation).toMatchObject({ cause: 'DESTINO_INEXISTENTE', pausesAI: true });
      expect(result.escalation.reason).toContain(target);
      expect(result.reply).toBeNull();
    }
  });

  it('impide ciclos y más de dos saltos', async () => {
    const self = await run([route(), route('ventas').replace('"recepcion"', '"ventas"')]);
    expect(self.result.escalation.cause).toBe('CICLO');
    const expanded = [...agents, ...['info', 'pagos'].map((name) => ({ ...agents[1], name }))];
    const { result, calls } = await run([route(), route('info').replace('"recepcion"', '"ventas"'),
      route('pagos').replace('"recepcion"', '"info"')], { deps: { agents: expanded } });
    expect(result.escalation.cause).toBe('CICLO');
    expect(calls).toHaveLength(3);
  });

  it('corrige JSON una vez sin filtrar valores a los issues', async () => {
    const { result, calls } = await run(['CENTINELA-RESPUESTA no-json', agentJson()]);
    expect(result.kind).toBe('RESPUESTA');
    expect(calls).toHaveLength(2);
    expect(calls[1].messages.at(-1).content).not.toContain('CENTINELA');
    expect(JSON.stringify(result.attempts)).not.toContain('CENTINELA');
    const failed = await run(['JSON roto', 'otra vez roto']);
    expect(failed.result).toMatchObject({ reply: null, captured: {}, action: null,
      escalation: { cause: 'SALIDA_INVALIDA', pausesAI: true } });
    expect(failed.calls).toHaveLength(2);
  });

  it('una guarda intercepta y permite corregir, sin aceptar texto prohibido', async () => {
    const { result } = await run([agentJson({ reply: 'Tu pago quedó confirmado' }), agentJson()]);
    expect(result.kind).toBe('RESPUESTA');
    expect(result.attempts[0].issues[0].rule).toBe('GUARD_G1');
    const failed = await run([agentJson({ reply: 'Tu pago quedó confirmado' }), agentJson({ reply: 'Ya eres socio' })]);
    expect(failed.result.escalation.cause).toBe('SALIDA_INVALIDA');
    expect(failed.result.reply).toBeNull();
  });

  it('reintenta proveedor una vez y combina como máximo tres llamadas con corrección', async () => {
    const { result, calls } = await run([timeout(), 'roto', agentJson()]);
    expect(calls).toHaveLength(3);
    expect(result.attempts.map((a) => a.outcome)).toEqual(['PROVEEDOR', 'INVALIDA', 'OK']);
    const failed = await run([timeout(), timeout()]);
    expect(failed.result.escalation).toMatchObject({ cause: 'PROVEEDOR', pausesAI: false });
    for (const code of ['CONFIG', 'INPUT']) {
      const res = await run([new LlmError(code, 'CENTINELA')]);
      expect(res.calls).toHaveLength(1);
      expect(res.result.escalation.cause).toBe('CONFIGURACION');
    }
    const permanent = await run([new LlmError('PROVIDER', '401')]);
    expect(permanent.calls).toHaveLength(1);
  });

  it('INVALID_OUTPUT vuelve a intentar el historial sin citar texto inexistente', async () => {
    const { result, calls } = await run([new LlmError('INVALID_OUTPUT', 'vacío'), agentJson()]);
    expect(result.kind).toBe('RESPUESTA');
    expect(calls[1].messages).toEqual(calls[0].messages);
  });

  it('umbral 0.5, parámetro 0.6 y emergencia con confianza baja', async () => {
    expect((await run([agentJson({ confidence: 0.49 })])).result.escalation.cause).toBe('CONFIANZA_BAJA');
    expect((await run([agentJson({ confidence: 0.5 })])).result.kind).toBe('RESPUESTA');
    expect((await run([agentJson({ confidence: 0.55 })], { deps: { threshold: 0.6 } })).result.escalation.cause).toBe('CONFIANZA_BAJA');
    const { result } = await run([escalation('EMERGENCIA', { confidence: 0.1, reply: 'Texto arbitrario del modelo: dieta' })]);
    expect(result).toMatchObject({ reply: null, escalation: { type: 'EMERGENCIA', pausesAI: true,
      notice: { kind: 'EMERGENCIA', text: EMERGENCY_NOTICE } } });
    expect(result.attempts).toHaveLength(1);
  });

  it('respuesta y trámite coexisten, y solicitud de persona solo tiene aviso', async () => {
    const { result } = await run([route(), escalation('TRAMITE_RECEPCION', { agent: 'ventas',
      reply: 'Recepción revisará tu preferencia de visita.' })]);
    expect(result).toMatchObject({ kind: 'RESPUESTA', reply: 'Recepción revisará tu preferencia de visita.',
      escalation: { type: 'TRAMITE_RECEPCION', pausesAI: false, notice: { kind: 'NINGUNO' } } });
    const person = await run([escalation('SOLICITUD_HUMANO')]);
    expect(person.result).toMatchObject({ kind: 'ESCALAMIENTO', reply: null,
      escalation: { pausesAI: true, notice: { kind: 'AVISO_FIJO' } } });
  });

  it('permite exclusivamente el aviso médico fijo para una respuesta médica', async () => {
    expect((await run([sale({ reply: MEDICAL_NOTICE })], { entryAgent: 'ventas' })).result.reply).toBe(MEDICAL_NOTICE);
  });

  it('contexto inválido o inaccesible produce CONFIGURACION y cero llamadas', async () => {
    for (const builder of [() => { throw new Error('CENTINELA'); }, () => 'x'.repeat(24001), () => '--bandera']) {
      const { result, calls } = await run([], { deps: { buildSystem: builder } });
      expect(result.escalation.cause).toBe('CONFIGURACION');
      expect(calls).toHaveLength(0);
      expect(JSON.stringify(result)).not.toContain('CENTINELA');
    }
  });

  it('PAGO conserva respuesta sin pausa y una escalación con pausa prevalece sobre la confianza baja', async () => {
    const payer = { ...agents[1], name: 'pagos', escalations: ['PAGO'] };
    const { result } = await run([escalation('PAGO', { agent: 'pagos', reply: 'El equipo revisará tu comprobante.' })],
      { entryAgent: 'pagos', deps: { agents: [...agents, payer] } });
    expect(result).toMatchObject({ kind: 'RESPUESTA', escalation: { type: 'PAGO', pausesAI: false } });
    const human = await run([escalation('SOLICITUD_HUMANO', { confidence: 0.1 })]);
    expect(human.result.escalation.type).toBe('SOLICITUD_HUMANO');
  });

  it('normaliza un historial que empieza por assistant también al ejecutarlo', async () => {
    const { calls } = await run([agentJson()], { messages: [
      { role: 'assistant', content: '¿Con quién tengo el gusto?' }, { role: 'user', content: 'Ana' },
    ] });
    expect(calls[0].messages[0].role).toBe('user');
    expect(calls[0].messages).toHaveLength(3);
  });
});

describe('presupuesto total con reloj falso', () => {
  it.each([[20000, 100000], [1000, 119000], [null, 119001]])('restante %s limita o impide la siguiente llamada', async (expected, elapsed) => {
    let time = 0;
    const { result, calls } = await run([() => { time = elapsed; return route(); }, sale()], { deps: { clock: () => time } });
    expect(calls[0].timeoutMs).toBe(45000);
    if (expected === null) {
      expect(calls).toHaveLength(1);
      expect(result.escalation.cause).toBe('TIMEOUT_TURNO');
    } else expect(calls[1].timeoutMs).toBe(expected);
  });

  it('reintento y corrección descuentan del mismo plazo, incluida la espera', async () => {
    let time = 0;
    const { calls } = await run([() => { time = 70000; return timeout(); }, () => { time = 110000; return 'roto'; }, agentJson()],
      { deps: { clock: () => time, sleep: async (ms) => { time += ms; } } });
    expect(calls.map((c) => c.timeoutMs)).toEqual([45000, 45000, 10000]);
  });

  it('agotarse al terminar una llamada descarta su respuesta y no inicia otra', async () => {
    let time = 0;
    const { result, calls } = await run([() => { time = 120001; return agentJson(); }], { deps: { clock: () => time } });
    expect(result.escalation.cause).toBe('TIMEOUT_TURNO');
    expect(calls).toHaveLength(1);
  });
});
