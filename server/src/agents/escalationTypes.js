// Catálogo de tipos de escalamiento y sus reglas (ADR-006 §1, ADR-005 §1, §4 y §5).
// Módulo puro: lo comparten el contrato de salida, el orquestador, el futuro modelo Escalation y las pruebas.
// No importa canales, outbox, modelos, servicios, rutas ni realtime, y no lee el entorno (orchestrator-rule.test.js).

export const ESCALATION_TYPES = Object.freeze([
  'SOLICITUD_HUMANO',
  'QUEJA_NEGOCIACION',
  'FUERA_DE_CONOCIMIENTO',
  'PAGO',
  'TRAMITE_RECEPCION',
  'EMERGENCIA',
]);

// Prioridad con su rango para ordenar (0 = más urgente). La prioridad es un supuesto: el PRD solo nombra «prioridad».
export const PRIORITY_RANKS = Object.freeze({ CRITICA: 0, ALTA: 1, NORMAL: 2 });

export const NOTICE_KINDS = Object.freeze(['AVISO_FIJO', 'EMERGENCIA', 'NINGUNO']);

export const ESCALATION_SOURCES = Object.freeze(['AGENTE', 'SISTEMA']);

export const ESCALATION_CAUSES = Object.freeze([
  'CONFIANZA_BAJA',
  'SALIDA_INVALIDA',
  'PROVEEDOR',
  'DESTINO_INEXISTENTE',
  'CICLO',
  'CONFIGURACION',
  'TIMEOUT_TURNO',
]);

// Fallos de infraestructura: Escalation visible, SIN pausa y un aviso estándar por incidente abierto (ADR-005 §5, ADR-006 §1).
export const SYSTEMIC_CAUSES = Object.freeze(['PROVEEDOR', 'CONFIGURACION', 'TIMEOUT_TURNO']);

// Tipo que usa todo resultado seguro del sistema (ADR-005 §5).
export const SAFE_RESULT_TYPE = 'FUERA_DE_CONOCIMIENTO';

// Política del `reply` del agente con action ESCALAR (ADR-005 §4):
//   NULO     -> el reply debe ser null (el aviso lo manda el sistema);
//   TEXTO    -> el reply es obligatorio («respuesta + escalamiento sin pausa»);
//   IGNORADO -> null o texto; el sistema envía siempre su texto fijo (EMERGENCIA).
export const REPLY_POLICIES = Object.freeze(['NULO', 'TEXTO', 'IGNORADO']);

const rule = (pausesAI, priority, noticeKind, reply) =>
  Object.freeze({ pausesAI, priority, priorityRank: PRIORITY_RANKS[priority], noticeKind, reply });

// Reglas por tipo (ADR-006 §1, tabla «Tipos y reglas»). EMERGENCIA pausa DESPUÉS del aviso del 911 (lo aplica el servicio).
export const ESCALATION_RULES = Object.freeze({
  EMERGENCIA: rule(true, 'CRITICA', 'EMERGENCIA', 'IGNORADO'),
  SOLICITUD_HUMANO: rule(true, 'ALTA', 'AVISO_FIJO', 'NULO'),
  QUEJA_NEGOCIACION: rule(true, 'ALTA', 'AVISO_FIJO', 'NULO'),
  FUERA_DE_CONOCIMIENTO: rule(true, 'NORMAL', 'AVISO_FIJO', 'NULO'),
  PAGO: rule(false, 'ALTA', 'NINGUNO', 'TEXTO'),
  TRAMITE_RECEPCION: rule(false, 'NORMAL', 'NINGUNO', 'TEXTO'),
});

export function isEscalationType(type) {
  return ESCALATION_TYPES.includes(type);
}

export function isSystemicCause(cause) {
  return SYSTEMIC_CAUSES.includes(cause);
}

// Regla efectiva de un escalamiento según su tipo y su causa (null si lo escaló un agente).
// Las causas sistémicas no pausan aunque el tipo (FUERA_DE_CONOCIMIENTO) sí lo haga; las demás causas siguen la regla del tipo.
// Lanza TypeError ante un tipo o una causa desconocidos (error de programación).
export function escalationPolicy(type, cause = null) {
  if (!isEscalationType(type)) throw new TypeError('tipo de escalamiento desconocido');
  if (cause !== null && !ESCALATION_CAUSES.includes(cause)) throw new TypeError('causa de escalamiento desconocida');
  // Todo resultado seguro del sistema es FUERA_DE_CONOCIMIENTO (ADR-005 §5).
  if (cause !== null && type !== SAFE_RESULT_TYPE) throw new TypeError('una causa del sistema solo aplica a FUERA_DE_CONOCIMIENTO');
  const { pausesAI, priority, priorityRank, noticeKind } = ESCALATION_RULES[type];
  const systemic = isSystemicCause(cause);
  return Object.freeze({
    type,
    cause,
    source: cause === null ? 'AGENTE' : 'SISTEMA',
    priority,
    priorityRank,
    pausesAI: systemic ? false : pausesAI,
    noticeKind,
    systemic,
  });
}
