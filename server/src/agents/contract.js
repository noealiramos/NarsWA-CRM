import { z } from 'zod';
import { ESCALATION_RULES, ESCALATION_TYPES } from './escalationTypes.js';

// Contrato de salida de los agentes (ADR-005 §4, S72): exactamente siete claves y reglas de coherencia.
// Módulo puro: no importa canales, outbox, modelos, servicios, rutas ni realtime, y no lee el entorno.
// Ningún mensaje de error incluye valores recibidos (pueden traer texto del lead o del modelo): solo ruta y regla.

export const OUTPUT_KEYS = Object.freeze(['agent', 'reply', 'stage', 'action', 'handoff', 'confidence', 'notes']);
export const AGENT_ACTIONS = Object.freeze(['NINGUNA', 'DERIVAR', 'REGISTRAR_DATOS', 'ESCALAR']);
export const HANDOFF_TARGETS = Object.freeze(['ventas', 'info', 'pagos', 'humano']);
export const SPECIALIST_TARGETS = Object.freeze(['ventas', 'info', 'pagos']);
// S72: el agente solo puede proponer estas etapas; nunca VISITA_AGENDADA, VISITO, PAGO_EN_REVISION, SOCIO ni PERDIDO.
export const PROPOSABLE_STAGES = Object.freeze(['NUEVO', 'EN_CONVERSACION']);

export const MAX_REPLY_CHARS = 4096;
export const MAX_REASON_CHARS = 300;
export const MAX_NOTES_CHARS = 300;

// Mensaje único para cualquier fallo de extracción: el de JSON.parse no se cita porque V8 incluye fragmentos del texto.
export const INVALID_JSON_MESSAGE = 'la respuesta no es JSON válido';

// Reglas de coherencia (id estable + mensaje fijo, sin valores). El id viaja en `issues[].rule`.
const COHERENCE = {
  HANDOFF_PROHIBIDO: 'con esta acción handoff debe ser null',
  HANDOFF_REQUERIDO: 'con esta acción handoff es obligatorio',
  REPLY_REQUERIDO: 'con esta acción o tipo de escalamiento reply es obligatorio',
  REPLY_PROHIBIDO: 'con esta acción o tipo de escalamiento reply debe ser null',
  DESTINO_NO_ESPECIALISTA: 'DERIVAR solo admite como destino ventas, info o pagos',
  ESCALAMIENTO_EN_DERIVACION: 'DERIVAR exige escalation null',
  DESTINO_NO_HUMANO: 'ESCALAR exige como destino humano',
  ESCALAMIENTO_REQUERIDO: 'ESCALAR exige un tipo de escalamiento',
  ESCALAMIENTO_NO_DECLARADO: 'el agente no declara este tipo de escalamiento en el registro',
};

function assertAgentDef(agentDef) {
  if (!agentDef || typeof agentDef.name !== 'string' || agentDef.name.length === 0) {
    throw new TypeError('agentDef.name es obligatorio');
  }
  if (!Array.isArray(agentDef.escalations) || agentDef.escalations.some((type) => !ESCALATION_TYPES.includes(type))) {
    throw new TypeError('agentDef.escalations debe ser una lista de tipos de escalamiento válidos');
  }
}

// Un esquema por agente: `agent` y los tipos de escalamiento permitidos vienen del registro.
export function buildAgentOutputSchema(agentDef) {
  assertAgentDef(agentDef);
  const declared = new Set(agentDef.escalations);

  return z
    .object({
      agent: z.literal(agentDef.name),
      reply: z.string().trim().min(1).max(MAX_REPLY_CHARS).nullable(), // "" no es válido: debe ser null
      stage: z.enum(PROPOSABLE_STAGES).nullable(),
      action: z.enum(AGENT_ACTIONS),
      handoff: z
        .object({
          target: z.enum(HANDOFF_TARGETS),
          escalation: z.enum(ESCALATION_TYPES).nullable(),
          reason: z.string().trim().min(1).max(MAX_REASON_CHARS),
        })
        .strict()
        .nullable(),
      confidence: z.number().min(0).max(1),
      notes: z.string().max(MAX_NOTES_CHARS),
    })
    .strict()
    .superRefine((out, ctx) => {
      const fail = (path, rule) => ctx.addIssue({ code: 'custom', path, message: COHERENCE[rule], params: { rule } });
      // Defensivo: si la forma ya falló, la coherencia no se evalúa sobre datos sin forma.
      const handoffOk = out.handoff === null || typeof out.handoff === 'object';
      if (!AGENT_ACTIONS.includes(out.action) || !handoffOk) return;

      if (out.action === 'NINGUNA' || out.action === 'REGISTRAR_DATOS') {
        if (out.handoff !== null) fail(['handoff'], 'HANDOFF_PROHIBIDO');
        if (out.reply === null) fail(['reply'], 'REPLY_REQUERIDO');
        return;
      }

      if (out.handoff === null) {
        fail(['handoff'], 'HANDOFF_REQUERIDO');
        return;
      }

      if (out.action === 'DERIVAR') {
        if (!SPECIALIST_TARGETS.includes(out.handoff.target)) fail(['handoff', 'target'], 'DESTINO_NO_ESPECIALISTA');
        if (out.handoff.escalation !== null) fail(['handoff', 'escalation'], 'ESCALAMIENTO_EN_DERIVACION');
        if (out.reply !== null) fail(['reply'], 'REPLY_PROHIBIDO');
        return;
      }

      // ESCALAR
      if (out.handoff.target !== 'humano') fail(['handoff', 'target'], 'DESTINO_NO_HUMANO');
      const type = out.handoff.escalation;
      if (type === null) {
        fail(['handoff', 'escalation'], 'ESCALAMIENTO_REQUERIDO');
        return;
      }
      if (!declared.has(type)) fail(['handoff', 'escalation'], 'ESCALAMIENTO_NO_DECLARADO');
      const policy = ESCALATION_RULES[type].reply;
      if (policy === 'NULO' && out.reply !== null) fail(['reply'], 'REPLY_PROHIBIDO');
      if (policy === 'TEXTO' && out.reply === null) fail(['reply'], 'REPLY_REQUERIDO');
      // IGNORADO (EMERGENCIA): null o texto; el sistema envía siempre EMERGENCY_NOTICE.
    });
}

// Mensajes genéricos por código de zod: los de zod pueden citar claves extra (que vienen de la salida del modelo).
const GENERIC_MESSAGES = {
  invalid_type: 'tipo inválido o campo faltante',
  invalid_value: 'valor no permitido',
  invalid_format: 'formato inválido',
  too_small: 'por debajo del mínimo permitido',
  too_big: 'excede el máximo permitido',
  unrecognized_keys: 'contiene claves no permitidas',
  invalid_union: 'valor inválido',
};

// Convierte issues de zod a `{ path, rule, message }` sin valores recibidos ni nombres de claves extra.
export function formatIssues(zodIssues) {
  return zodIssues.map((issue) => {
    const path = issue.path.map(String).join('.');
    if (issue.code === 'custom' && issue.params?.rule) {
      return { path, rule: issue.params.rule, message: COHERENCE[issue.params.rule] };
    }
    return { path, rule: issue.code, message: GENERIC_MESSAGES[issue.code] ?? 'valor inválido' };
  });
}

// Valida un objeto ya parseado contra el contrato del agente.
export function validateAgentOutput(agentDef, value) {
  const result = buildAgentOutputSchema(agentDef).safeParse(value);
  if (result.success) return { ok: true, output: result.data };
  return { ok: false, issues: formatIssues(result.error.issues) };
}

// Un solo bloque de código (``` o ```json) que envuelva TODO el texto; nada antes ni después.
const FENCED = /^```(?:json)?[^\S\r\n]*\r?\n?([\s\S]*?)\r?\n?[^\S\r\n]*```$/i;

// trim; se tolera un bloque de código que envuelva todo el texto; luego JSON.parse.
// No busca JSON dentro de prosa (evita tomar un objeto inyectado por el lead).
export function parseAgentJson(text) {
  const invalid = { ok: false, issues: [{ path: '', rule: 'JSON', message: INVALID_JSON_MESSAGE }] };
  if (typeof text !== 'string') return invalid;
  let body = text.trim();
  const fenced = body.match(FENCED);
  if (fenced) {
    body = fenced[1];
    if (body.includes('```')) return invalid; // dos bloques o un bloque anidado
  }
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return invalid;
  }
}

const NOTE_KEYS = new Set(['nombre', 'horario', 'objetivo', 'presupuesto']);
const NAME = /^[\p{L}\s.'-]+$/u;
const SCHEDULES = { manana: 'MANANA', tarde: 'TARDE', noche: 'NOCHE' };
const MAX_FREE_TEXT = 120;
const MAX_NAME = 80;

const fold = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

function parseNoteValue(key, raw) {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (value.length === 0) return undefined;
  if (key === 'nombre') return value.length <= MAX_NAME && NAME.test(value) ? value : undefined;
  if (key === 'horario') {
    // «mañana», «manana», «tarde», «noche», y su plural («tardes»); cualquier otro valor se descarta.
    const word = fold(value).replace(/s$/, '');
    return SCHEDULES[word];
  }
  return value.length <= MAX_FREE_TEXT ? value : undefined;
}

// Extrae datos capturados de `notes` («clave: valor; clave: valor»). Claves desconocidas se ignoran;
// un valor inválido se descarta sin invalidar la salida. Si una clave se repite, gana el primer valor válido.
export function parseNotes(notes) {
  const captured = {};
  if (typeof notes !== 'string') return captured;
  for (const segment of notes.split(';')) {
    const colon = segment.indexOf(':');
    if (colon === -1) continue;
    const key = fold(segment.slice(0, colon));
    if (!NOTE_KEYS.has(key) || key in captured) continue;
    const value = parseNoteValue(key, segment.slice(colon + 1));
    if (value !== undefined) captured[key] = value;
  }
  return captured;
}
