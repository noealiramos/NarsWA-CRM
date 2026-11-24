import { z } from 'zod';
import { AGENT_ACTIONS } from '../../src/agents/contract.js';
import { ESCALATION_CAUSES, ESCALATION_TYPES, NOTICE_KINDS } from '../../src/agents/escalationTypes.js';

export const HARD_LIMITS = ['PAGOS', 'PRECIOS', 'DESCUENTOS', 'MEDICO'];
const agentNames = ['recepcion', 'ventas', 'info', 'pagos'];
export const regexSource = z.string().min(1).refine((source) => {
  try { new RegExp(source, 'i'); return true; } catch { return false; }
}, 'regex no compilable');
const regexList = z.array(regexSource);
const forbiddenSchema = z.object({
  pattern: regexSource, limit: z.enum(HARD_LIMITS),
  matches: z.array(z.string()).min(1), misses: z.array(z.string()).min(1),
}).strict().superRefine((item, ctx) => {
  let regex;
  try { regex = new RegExp(item.pattern, 'i'); } catch { return; }
  if (item.matches.some((text) => !regex.test(text)) || item.misses.some((text) => regex.test(text))) {
    ctx.addIssue({ code: 'custom', message: 'Los ejemplos no corresponden al patrón forbidden' });
  }
});

// Contrato de DATOS de QA, no es un runner ni una llamada al modelo (paso 7).
export const caseSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1) }).strict()).min(1),
  expect: z.object({
    mode: z.enum(['AISLADO', 'INTEGRACION']).default('AISLADO'),
    action: z.enum(AGENT_ACTIONS).nullable(),
    handoffTarget: z.enum([...agentNames, 'humano']).nullable(),
    escalation: z.enum(ESCALATION_TYPES).nullable(),
    replyNull: z.boolean(), mustMatch: regexList, mustNotMatch: regexList,
    finalAgent: z.enum(agentNames).optional(), trail: z.array(z.enum(agentNames)).optional(),
    stage: z.enum(['NUEVO', 'EN_CONVERSACION']).nullable().optional(),
    pausesAI: z.boolean().optional(), noticeKind: z.enum(NOTICE_KINDS).optional(),
    cause: z.enum(ESCALATION_CAUSES).nullable().optional(),
    minConfidence: z.number().min(0).max(1).optional(), noticeMustMatch: regexList.optional(),
    hardLimit: z.array(z.enum(HARD_LIMITS)).optional(), forbidden: z.array(forbiddenSchema).optional(),
    priceClaims: z.array(z.object({ concept: z.string().min(1), pattern: regexSource,
      amounts: z.array(z.number().finite().min(0)).min(1) }).strict()).optional(),
  }).strict(),
}).strict().superRefine((item, ctx) => {
  const exp = item.expect;
  const fail = (message) => ctx.addIssue({ code: 'custom', path: ['expect'], message });
  if (item.messages.at(-1).role !== 'user') fail('El último turno debe ser user');
  if (exp.action === null) {
    if (exp.mode !== 'INTEGRACION' || !exp.cause || exp.handoffTarget !== null
      || exp.escalation !== 'FUERA_DE_CONOCIMIENTO' || !exp.replyNull) fail('action null solo en un resultado seguro de integración');
  } else if (exp.action === 'DERIVAR') {
    if (!['ventas', 'info', 'pagos'].includes(exp.handoffTarget) || exp.escalation !== null || !exp.replyNull) fail('Derivación incoherente');
  } else if (exp.action === 'ESCALAR') {
    if (exp.handoffTarget !== 'humano' || !exp.escalation) fail('Escalamiento incoherente');
  } else if (exp.handoffTarget !== null || exp.escalation !== null || exp.replyNull) fail('Respuesta incoherente');
  if (exp.escalation === 'EMERGENCIA' && (!exp.replyNull || exp.noticeKind !== 'EMERGENCIA'
    || !exp.noticeMustMatch?.length || exp.mustMatch.length)) fail('Emergencia debe comprobar el aviso del sistema');
  for (const forbidden of exp.forbidden ?? []) {
    if (!exp.hardLimit?.includes(forbidden.limit)) fail('forbidden requiere su límite declarado en hardLimit');
  }
});

export function parseConversationCases(value, { integration = false } = {}) {
  const cases = z.array(caseSchema).min(1).parse(value);
  if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error('IDs de casos repetidos');
  if (integration && value.some((item) => item.expect.mode !== 'INTEGRACION')) {
    throw new Error('integracion.json requiere mode INTEGRACION explícito');
  }
  return cases;
}
