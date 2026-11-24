import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from '../config/env.js';
import { generate } from '../llm/index.js';
import { MAX_SYSTEM_CHARS } from '../llm/schemas.js';
import { AGENTS } from './registry.js';
import { buildSystem } from './context.js';
import { parseAgentJson, parseNotes, validateAgentOutput } from './contract.js';
import { normalizeHistory } from './history.js';
import { escalationPolicy, SAFE_RESULT_TYPE } from './escalationTypes.js';
import { EMERGENCY_NOTICE, HANDOFF_NOTICE } from './noticeTexts.js';
import { checkReply } from './replyGuard.js';

export const MAX_HANDOFFS = 2;
export const AGENT_CALL_TIMEOUT_MS = 45000;
export const TURN_DEADLINE_MS = 120000;
export const MIN_CALL_MS = 1000;
export const PROVIDER_RETRY_DELAY_MS = 1000;

const REASONS = {
  CONFIANZA_BAJA: 'La confianza de la respuesta es insuficiente',
  SALIDA_INVALIDA: 'El agente no produjo una respuesta válida',
  PROVEEDOR: 'El proveedor de IA no pudo responder',
  DESTINO_INEXISTENTE: 'El agente de destino no está disponible',
  CICLO: 'La derivación excedió los límites del turno',
  CONFIGURACION: 'La configuración del agente no está disponible',
  TIMEOUT_TURNO: 'Se agotó el plazo del turno',
};

function makeEscalation(type, cause, reason) {
  const policy = escalationPolicy(type, cause);
  const text = policy.noticeKind === 'EMERGENCIA' ? EMERGENCY_NOTICE
    : policy.noticeKind === 'AVISO_FIJO' ? HANDOFF_NOTICE : null;
  return { type, source: policy.source, cause, reason, pausesAI: policy.pausesAI,
    notice: { kind: policy.noticeKind, text } };
}

// Sin DB, canal ni eventos. Quien llama aplica el TurnResult cuando exista el cableado.
export async function runAgentTurn({ messages, entryAgent = 'recepcion', followHandoffs = true,
  now = new Date(), deps = {} } = {}) {
  const history = normalizeHistory(messages);
  const clock = deps.clock ?? (() => performance.now());
  const started = clock();
  const llm = deps.generate ?? generate;
  const context = deps.buildSystem ?? buildSystem;
  const agents = deps.agents ?? AGENTS;
  const threshold = deps.threshold ?? config.AGENT_CONFIDENCE_THRESHOLD;
  const sleep = deps.sleep ?? delay;
  if (!Array.isArray(agents) || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new TypeError('Dependencias del orquestador inválidas');
  }
  const trail = [], outputs = [], attempts = [], usage = [];
  let current = entryAgent;
  let hops = 0;
  const remaining = () => Math.max(0, TURN_DEADLINE_MS - (clock() - started));
  const finish = (fields) => ({ ...fields, trail: [...trail], outputs: [...outputs],
    attempts: [...attempts], usage: [...usage], durationMs: Math.max(0, Math.round(clock() - started)) });
  const safe = (cause) => finish({ kind: 'ESCALAMIENTO', agent: current, reply: null,
    action: null, handoff: null, confidence: null, notes: '', captured: {},
    stage: { proposed: null, applied: false, reason: 'POLITICA_VIGENTE' },
    escalation: makeEscalation(SAFE_RESULT_TYPE, cause, cause === 'DESTINO_INEXISTENTE'
      ? `${REASONS[cause]}: ${current}`.slice(0, 300) : REASONS[cause]) });

  while (true) {
    if (remaining() < MIN_CALL_MS) return safe('TIMEOUT_TURNO');
    const agent = agents.find((item) => item.name === current);
    if (!agent || !agent.connected) return safe('DESTINO_INEXISTENTE');
    if (trail.includes(current)) return safe('CICLO');
    trail.push(current);
    let system;
    try {
      system = await context(agent, { now });
      if (typeof system !== 'string' || !system.trim() || system.trimStart().startsWith('-')
        || !Number.isInteger(agent.maxSystemChars) || system.length > MAX_SYSTEM_CHARS
        || system.length > agent.maxSystemChars) return safe('CONFIGURACION');
    } catch {
      return safe('CONFIGURACION');
    }
    const model = agent.model === 'ROUTER' ? config.ANTHROPIC_MODEL_ROUTER : config.ANTHROPIC_MODEL_AGENTS;
    let turnMessages = history.map((m) => ({ ...m }));
    let providerRetried = false, corrected = false, output;

    while (!output) {
      const timeoutMs = Math.min(AGENT_CALL_TIMEOUT_MS, remaining());
      if (timeoutMs < MIN_CALL_MS) return safe('TIMEOUT_TURNO');
      let raw, issues;
      try {
        const response = await llm({ system, messages: turnMessages.map((m) => ({ ...m })), model, timeoutMs: Math.floor(timeoutMs) });
        if (response?.usage) usage.push({ ...response.usage, agent: current, model });
        raw = response?.text;
        if (remaining() <= 0) return safe('TIMEOUT_TURNO');
        const json = parseAgentJson(raw);
        const validation = json.ok ? validateAgentOutput(agent, json.value) : json;
        if (validation.ok) {
          const candidate = validation.output;
          // EMERGENCIA ignora por completo el reply del modelo. El aviso es fijo:
          // pasarlo por G4 bloquearía el 911 por contener la palabra «médica».
          issues = candidate.action === 'ESCALAR' && candidate.handoff.escalation === 'EMERGENCIA'
            ? [] : checkReply(candidate.reply, { knowledge: system });
          if (!issues.length) output = candidate;
        } else issues = validation.issues;
      } catch (error) {
        const code = ['INPUT', 'CONFIG', 'TIMEOUT', 'PROCESS', 'PROVIDER', 'INVALID_OUTPUT'].includes(error?.code)
          ? error.code : 'UNKNOWN';
        if (code === 'INVALID_OUTPUT') {
          issues = [{ path: '', rule: 'INVALID_OUTPUT', message: 'El motor no devolvió texto utilizable' }];
        } else {
          attempts.push({ agent: current, outcome: 'PROVEEDOR', code, retryable: error?.retryable === true });
          if (remaining() < MIN_CALL_MS) return safe('TIMEOUT_TURNO');
          if (code === 'CONFIG' || code === 'INPUT') return safe('CONFIGURACION');
          if (error?.retryable !== true || providerRetried) return safe('PROVEEDOR');
          providerRetried = true;
          if (remaining() < PROVIDER_RETRY_DELAY_MS + MIN_CALL_MS) return safe('TIMEOUT_TURNO');
          await sleep(PROVIDER_RETRY_DELAY_MS);
          continue;
        }
      }
      if (output) {
        attempts.push({ agent: current, outcome: 'OK' });
        outputs.push(output);
        break;
      }
      attempts.push({ agent: current, outcome: 'INVALIDA', issues });
      if (corrected) return safe('SALIDA_INVALIDA');
      corrected = true;
      if (typeof raw === 'string' && raw.trim()) {
        const rules = issues.map((issue) => `${issue.path || 'salida'}: ${issue.rule}`).join('; ');
        turnMessages = [...history.map((m) => ({ ...m })), { role: 'assistant', content: raw },
          { role: 'user', content: `Tu respuesta anterior no cumple el contrato de salida: ${rules}. Responde de nuevo únicamente con el objeto JSON de siete claves, sin texto adicional.` }];
      }
    }

    const policy = output.action === 'ESCALAR' ? escalationPolicy(output.handoff.escalation) : null;
    if (output.confidence < threshold && !policy?.pausesAI) return safe('CONFIANZA_BAJA');
    if (output.action === 'DERIVAR' && followHandoffs) {
      const target = output.handoff.target;
      if (trail.includes(target) || hops >= MAX_HANDOFFS) return safe('CICLO');
      hops += 1;
      current = target;
      continue;
    }
    const escalation = policy ? makeEscalation(output.handoff.escalation, null, output.handoff.reason) : null;
    // PAGO/TRAMITE son RESPUESTA con escalation simultánea, no una rama excluyente.
    const kind = output.action === 'DERIVAR' ? 'DERIVACION'
      : escalation?.pausesAI ? 'ESCALAMIENTO' : 'RESPUESTA';
    return finish({ kind, agent: current, reply: kind === 'RESPUESTA' ? output.reply : null,
      action: output.action, handoff: output.handoff, confidence: output.confidence, notes: output.notes,
      captured: parseNotes(output.notes), stage: { proposed: output.stage, applied: false, reason: 'POLITICA_VIGENTE' }, escalation });
  }
}
