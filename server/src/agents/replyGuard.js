import { MEDICAL_NOTICE } from './noticeTexts.js';

// replyGuard (ADR-005 §4): red de seguridad determinista sobre el `reply` del agente. NO sustituye prompts ni evals.
//   G1 pago      -> no afirmar un pago/comprobante confirmado ni una membresía activa.
//   G2 montos    -> todo monto con marcador ($, pesos, mxn) debe estar en la base de conocimiento del agente.
//   G3 descuentos-> no ofrecer descuentos, promociones, precios ad hoc ni porcentajes.
//   G4 médico    -> con una raíz médica, el reply debe ser exactamente MEDICAL_NOTICE (playbook §8.4).
// Módulo puro: no lee archivos ni el entorno; la base de conocimiento llega como argumento.
// Los issues llevan ruta y regla, nunca el texto ni los valores encontrados.
// Limitaciones conocidas (fijadas por pruebas en reply-guard.test.js): montos en palabras o abreviados,
// monto con plan o concepto equivocado, paráfrasis no listadas, «Dolores» en G4 y la ventana de negación.

export const GUARD_RULES = Object.freeze({
  G1: 'GUARD_G1',
  G2: 'GUARD_G2',
  G3: 'GUARD_G3',
  G4: 'GUARD_G4',
});

const MESSAGES = {
  GUARD_G1: 'afirma un pago confirmado o una membresía activa',
  GUARD_G2: 'contiene un monto que no está en la base de conocimiento',
  GUARD_G3: 'ofrece un descuento, promoción o precio especial',
  GUARD_G4: 'tema médico: debe ser exactamente el mensaje estándar del playbook §8.4',
};

export const NEGATION_WINDOW = 25;

// Minúsculas, sin acentos (también ñ -> n) y espacios colapsados. Los saltos de línea se conservan como fin de oración.
export function normalizeText(text) {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n[\s]*/g, '\n')
    .trim();
}

// Límites de cláusula de la ventana de negación: fin de oración, salto de línea, `,`, `;`, `pero`, `aunque`, `sino`.
// Los dos puntos NO cortan (limitación conocida, ADR-005 §4).
const CLAUSE_BOUNDARY = /[.!?¡¿,;\n]|\b(?:pero|aunque|sino)\b/g;

// Texto de la misma cláusula en los `NEGATION_WINDOW` caracteres previos a `index`.
export function clauseWindow(text, index, size = NEGATION_WINDOW) {
  const window = text.slice(Math.max(0, index - size), index);
  let cut = 0;
  for (const match of window.matchAll(CLAUSE_BOUNDARY)) cut = match.index + match[0].length;
  return window.slice(cut);
}

// Recorre las coincidencias de `patterns` (regex con flags `gd` y grupo `v` = el ancla de la afirmación)
// y devuelve true si alguna NO tiene negación en su ventana.
function hasUnnegatedMatch(text, patterns, negation) {
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const anchor = match.indices.groups?.v?.[0] ?? match.index;
      if (!negation.test(clauseWindow(text, anchor))) return true;
    }
  }
  return false;
}

// ---------- G1: pago confirmado o membresía activa ----------

const PAYMENT_NOUN = '(?:pagos?|comprobantes?|depositos?|transferencias?)';
const PAYMENT_PARTICIPLE = '(?:confirmad|recibid|acreditad|aprobad|validad|registrad)[oa]s?';
const PAYMENT_PRETERITE = 'se (?:confirmo|acredito|valido|aprobo|registro|recibio)';
const PAYMENT_FIRST_PERSON =
  '(?:confirmamos|recibimos|acreditamos|aprobamos|validamos|registramos|ya (?:confirme|recibi|valide|registre|acredite|aprobe))';

// El ancla `v` es el verbo o participio: la negación debe ir en los 25 caracteres previos a él, en la misma cláusula.
const G1_PATTERNS = [
  // «tu pago quedó confirmado», «pago recibido», «tu pago aún no está confirmado» (negación antes del participio)
  new RegExp(`\\b${PAYMENT_NOUN}\\b[^.!?;\\n]{0,40}?\\b(?<v>${PAYMENT_PARTICIPLE}|${PAYMENT_PRETERITE})\\b`, 'gd'),
  // «queda confirmado tu pago», «recibido el comprobante»
  new RegExp(`\\b(?<v>${PAYMENT_PARTICIPLE}) (?:\\S+ ){0,2}?${PAYMENT_NOUN}\\b`, 'gd'),
  // «confirmamos tu pago», «ya recibí tu comprobante»
  new RegExp(`\\b(?<v>${PAYMENT_FIRST_PERSON}) (?:\\S+ ){0,2}?${PAYMENT_NOUN}\\b`, 'gd'),
  // «membresía activada», «tu membresía ya está activa»
  /\bmembresias? (?:ya )?(?:(?:quedo|queda|esta|fue|ha sido) )?(?<v>activad[oa]s?|activas?|confirmad[oa]s?|aprobad[oa]s?|listas?)\b/dg,
  // «ya quedó tu membresía»
  /\b(?<v>ya (?:quedo|queda|esta)) (?:lista |activa )?(?:tu|su) membresia\b/dg,
  // «activamos tu membresía»
  /\b(?<v>activamos|ya active|ya activamos) (?:tu|su) membresia\b/dg,
  // «ya eres socio»
  /\b(?<v>ya (?:eres|es|son)) (?:nuestr[oa]s? )?(?:soci[oa]s?|miembros?)\b/dg,
];
const G1_NEGATION = /\b(?:no|hasta que|una vez que)\b/; // incluye «aún no» y «todavía no»

export function violatesPaymentClaim(reply) {
  return hasUnnegatedMatch(normalizeText(reply), G1_PATTERNS, G1_NEGATION);
}

// ---------- G2: montos monetarios con marcador ----------

// Un solo recorrido consume también el sufijo: en "$199 MXN 30 días", MXN
// pertenece a 199 y no vuelve a interpretarse como prefijo de 30.
const NUMBER_TOKEN = String.raw`\d[\d.,]*(?: \d{3}(?!\d))*`;
const MONEY = new RegExp(
  String.raw`\$\s?(${NUMBER_TOKEN})(?:\s?(?:pesos|mxn)\b)?|(?<![\d.,])(${NUMBER_TOKEN})\s?(?:pesos|mxn)\b|\b(?:pesos|mxn)\s?(${NUMBER_TOKEN})`,
  'g',
);
const VALID_NUMBER = /^(?:\d{1,3}(?:[, ]\d{3})+|\d+)(?:\.\d{1,2})?$/;
const monetaryTokens = (text) => [...normalizeText(text).matchAll(MONEY)]
  .map((match) => (match[1] ?? match[2] ?? match[3]).replace(/[.,]$/, ''));

// «1,500.00» -> 150000 centavos. Solo se normaliza el formato numérico (separadores de miles).
function toCents(raw) {
  const [integer, decimals = ''] = raw.replace(/[, ]/g, '').split('.');
  return Number(integer) * 100 + Number(decimals.padEnd(2, '0'));
}

// Montos monetarios claramente identificados (cifra con `$` antes, o `pesos`/`mxn` justo antes o después),
// en centavos, únicos y ordenados. Un número sin marcador no es un monto. Mismo patrón para reply, digesto y fuentes.
export function extractMonetaryAmounts(text) {
  const cents = new Set();
  for (const token of monetaryTokens(text)) if (VALID_NUMBER.test(token)) cents.add(toCents(token));
  return [...cents].sort((a, b) => a - b);
}

export function violatesAmounts(reply, knowledge) {
  if (typeof knowledge !== 'string') throw new TypeError('knowledge (texto de referencia) es obligatorio para G2');
  // No interpretar formatos ambiguos como "$1.500" como $1.50 ni ignorarlos.
  if (monetaryTokens(reply).some((token) => !VALID_NUMBER.test(token))) return true;
  const allowed = new Set(extractMonetaryAmounts(knowledge));
  return extractMonetaryAmounts(reply).some((amount) => !allowed.has(amount));
}

// ---------- G3: descuentos, promociones y precios ad hoc ----------

const OFFER_VERB =
  '(?:te doy|te damos|te ofrezco|te ofrecemos|te hago|te hacemos|te aplico|te aplicamos|hay|tenemos|ofrecemos|contamos con|puedo ofrecerte|podemos ofrecerte|puedo darte|podemos darte)';
const DISCOUNT_TERM =
  '(?:descuentos?|rebajas?|promocion(?:es)?|ofertas?|bonificacion(?:es)?|cortesias?|2 ?x ?1|precios? especial(?:es)?|mas barat[oa]s?)';

// Con verbo, el ancla es el verbo; sin verbo, el término. La negación (no, ni, nunca, sin) en su ventana lo admite.
const G3_NEGATABLE = [
  new RegExp(`(?:\\b(?<v>${OFFER_VERB}) (?:\\S+ ){0,2}?)?\\b${DISCOUNT_TERM}\\b`, 'gd'),
];
const G3_NEGATION = /\b(?:no|ni|nunca|sin)\b/;
// Precios ad hoc y porcentajes: se rechazan siempre, aun con negación.
const G3_ALWAYS = [
  /\b(?:te lo dejo en|te lo dejamos en|te lo puedo dejar en|te lo podemos dejar en|lo dejo en|lo dejamos en|por menos)\b/,
  /\d+ ?%/,
  /\bpor ciento\b/,
];

export function violatesDiscounts(reply) {
  const text = normalizeText(reply);
  if (G3_ALWAYS.some((pattern) => pattern.test(text))) return true;
  return hasUnnegatedMatch(text, G3_NEGATABLE, G3_NEGATION);
}

// ---------- G4: temas médicos ----------

// Raíces sobre texto normalizado, sin límite de palabra (más conservador: «Dolores» casa con `dolor`).
const MEDICAL_ROOTS =
  /dieta|aliment|suplement|lesion|medic|dosis|dolor|enfermedad|tratamiento|rehabilit|caloria|proteina|creatina|embarazo|diabet|presion arterial/;

const collapse = (text) => String(text).trim().replace(/\s+/g, ' ');
const MEDICAL_NOTICE_COLLAPSED = collapse(MEDICAL_NOTICE);

export function hasMedicalRoot(reply) {
  return MEDICAL_ROOTS.test(normalizeText(reply).replace(/\n/g, ' '));
}

// Igualdad exacta con MEDICAL_NOTICE tras trim y colapso de espacios (no inclusión).
export function violatesMedical(reply) {
  return hasMedicalRoot(reply) && collapse(reply) !== MEDICAL_NOTICE_COLLAPSED;
}

// ---------- Conjunto ----------

// Revisa el reply con G1–G4. `knowledge` es el texto de referencia (digesto) del agente para G2.
// Devuelve [] si pasa, o un issue por regla violada: { path: 'reply', rule: 'GUARD_Gn', message }.
export function checkReply(reply, { knowledge } = {}) {
  if (reply === null || reply === undefined) return [];
  if (typeof reply !== 'string') throw new TypeError('reply debe ser texto o null');
  const issues = [];
  const add = (rule) => issues.push({ path: 'reply', rule, message: MESSAGES[rule] });
  if (violatesPaymentClaim(reply)) add(GUARD_RULES.G1);
  if (violatesAmounts(reply, knowledge)) add(GUARD_RULES.G2);
  if (violatesDiscounts(reply)) add(GUARD_RULES.G3);
  if (violatesMedical(reply)) add(GUARD_RULES.G4);
  return issues;
}
