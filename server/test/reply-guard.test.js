import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMERGENCY_NOTICE, HANDOFF_NOTICE, MEDICAL_NOTICE } from '../src/agents/noticeTexts.js';
import {
  GUARD_RULES,
  checkReply,
  clauseWindow,
  extractMonetaryAmounts,
  hasMedicalRoot,
  normalizeText,
  violatesAmounts,
  violatesDiscounts,
  violatesMedical,
  violatesPaymentClaim,
} from '../src/agents/replyGuard.js';

// ADR-005 §4 y §9: tablas de evasión, negación por cláusula, falsos positivos y limitaciones fijadas por prueba.
// Las limitaciones se fijan como comportamiento conocido, NO como deseable: si se corrigen, la prueba se invierte a propósito.
// El guard no lee archivos: la prueba inyecta como referencia el catálogo real (en 1b será el digesto del agente).
const CATALOGO = readFileSync(fileURLToPath(new URL('../../docs/negocio/catalogo.md', import.meta.url)), 'utf8');

const expectAll = (fn, texts, expected) => {
  for (const text of texts) expect(fn(text), `${expected ? 'debe rechazar' : 'debe admitir'}: ${text}`).toBe(expected);
};

describe('normalización y ventana de negación', () => {
  it('normaliza a minúsculas, sin acentos y con espacios colapsados', () => {
    expect(normalizeText('  Tu  PAGO\tquedó   CONFIRMADO  ')).toBe('tu pago quedo confirmado');
    expect(normalizeText('Mañana   promoción')).toBe('manana promocion');
    expect(normalizeText('Uno\n\n  dos')).toBe('uno\ndos');
  });

  it('la ventana se corta en fin de oración, coma, punto y coma, pero, aunque y sino (no en dos puntos)', () => {
    expect(clauseWindow('no te preocupes, tu pago ', 25)).toBe(' tu pago ');
    expect(clauseWindow('no; tenemos ', 25)).toBe(' tenemos ');
    expect(clauseWindow('no se si aplique pero tenemos ', 30)).toBe(' tenemos ');
    expect(clauseWindow('no es caro aunque tenemos ', 30)).toBe(' tenemos ');
    expect(clauseWindow('no es eso sino tenemos ', 30)).toBe(' tenemos ');
    expect(clauseWindow('no. tenemos ', 25)).toBe(' tenemos ');
    expect(clauseWindow('no solo te informo: ', 25)).toBe('no solo te informo: ');
  });
});

describe('G1: nunca afirma un pago confirmado (límite duro 4)', () => {
  it('rechaza las afirmaciones listadas', () => {
    expectAll(
      violatesPaymentClaim,
      [
        'Pago recibido',
        'Tu PAGO quedó CONFIRMADO',
        'confirmamos tu pago',
        'Ya quedó tu membresía',
        'membresia activada',
        'Ya eres socio',
        'Tu comprobante fue validado, gracias',
        'Queda confirmado tu pago',
        'Tu depósito se acreditó',
        'Ya recibí tu comprobante',
        'Tu membresía ya está activa',
        'Activamos tu membresía',
      ],
      true,
    );
  });

  it('rechaza una afirmación aunque haya una negación en otra cláusula', () => {
    expectAll(violatesPaymentClaim, ['No te preocupes, tu pago quedó confirmado', 'No tardó nada, pero ya quedó tu membresía'], true);
  });

  it('admite negaciones y frases que no afirman (falsos positivos)', () => {
    expectAll(
      violatesPaymentClaim,
      [
        'No puedo confirmar tu pago',
        'Tu pago aún no está confirmado',
        'Todavía no tenemos tu pago registrado',
        'Una vez que recepción valide tu pago, te avisamos',
        'Hasta que recepción lo confirme, tu pago no está acreditado',
        'Recepción confirmará tu pago cuando lo valide',
        'Recibimos tu mensaje',
        // PRD B2: no hay excepción por texto; simplemente no casa con G1.
        '¡Recibido! El equipo lo está validando 💪',
        'Tu membresía no está activa todavía',
      ],
      false,
    );
  });
});

describe('G2: montos monetarios con marcador presentes en la base (límite duro 1)', () => {
  it('no reutiliza el sufijo de moneda y rechaza formatos ambiguos completos', () => {
    expect(extractMonetaryAmounts('$199 MXN 30 días')).toEqual([19900]);
    expect(violatesAmounts('$199 MXN 30 días', '$199')).toBe(false);
    expect(extractMonetaryAmounts('$1.500')).toEqual([]);
    expect(violatesAmounts('$1.500', '$1.50')).toBe(true);
    expect(violatesAmounts('$1,500.00', '$1500')).toBe(false);
  });
  it('extrae montos con $, pesos o mxn y los compara en centavos', () => {
    expect(extractMonetaryAmounts('$1,500.00 o $1500, 1500 pesos y 1,500 MXN')).toEqual([150000]);
    expect(extractMonetaryAmounts('$399.83 y $ 433')).toEqual([39983, 43300]);
    expect(extractMonetaryAmounts('pesos 250 y 90 mxn')).toEqual([9000, 25000]);
    expect(extractMonetaryAmounts('$1 299')).toEqual([129900]);
  });

  it('un número sin marcador no es un monto', () => {
    expect(extractMonetaryAmounts('3 meses, 60 min, 30 días y 1500 sueltos')).toEqual([]);
    expectAll((text) => violatesAmounts(text, ''), ['3 meses', '60 min', '30 días', 'Son 1500 al año'], false);
  });

  it('rechaza un monto que no está en la base, en cualquier formato', () => {
    expectAll(
      (text) => violatesAmounts(text, CATALOGO),
      ['El plan cuesta $999', '$1,500.00', '$1500', '1500 pesos', '1,500 mxn', '1,500 MXN', 'Mensual $499 y anual $4,999'],
      true,
    );
  });

  it('admite el mismo monto en formatos equivalentes cuando sí está en la base', () => {
    const digest = 'Plan anual: $1,500.00';
    expectAll((text) => violatesAmounts(text, digest), ['$1,500.00', '$1500', '1500 pesos', '1,500 mxn', '1,500 MXN', '$1 500'], false);
  });

  it('admite los montos del catálogo tal cual y en formatos equivalentes', () => {
    expectAll(
      (text) => violatesAmounts(text, CATALOGO),
      [
        'El Trimestral equivale a unos $433 al mes',
        'El Semestral sale en $399.83 al mes',
        'La inscripción es de $199',
        'La inscripción es de 199 pesos',
        'Pago inicial: $698 con el Mensual o $598 con Estudiante',
        'El Trimestral cuesta $1,299 o 1299 pesos',
        'El Semestral cuesta $2399.00',
      ],
      false,
    );
  });

  it('limitación conocida: montos en palabras, abreviados o con plan/concepto equivocado NO se detectan', () => {
    expectAll(
      (text) => violatesAmounts(text, CATALOGO),
      [
        'El plan cuesta mil quinientos pesos',
        'Son cuatrocientos noventa y nueve al mes',
        'Te sale en 1.5k pesos',
        // $199 es la inscripción, no la mensualidad: G2 no asocia monto y plan.
        'La mensualidad del plan Mensual es de $199',
      ],
      false,
    );
  });

  it('exige el texto de referencia (no lee archivos)', () => {
    expect(() => violatesAmounts('$499')).toThrow(TypeError);
    expect(() => checkReply('$499')).toThrow(TypeError);
  });
});

describe('G3: sin descuentos ni negociación (límite duro 2)', () => {
  it('rechaza términos de descuento y precios ad hoc', () => {
    expectAll(
      violatesDiscounts,
      [
        'DESCUENTO',
        'Rebaja',
        'promocion',
        'Te damos 10 de  descuento',
        'te lo dejo en $450',
        'te lo dejamos en 400',
        'Te tengo un precio especial',
        '2x1 en inscripción',
        '15%',
        '15 % menos',
        '15 por ciento',
        'Te damos una bonificacion',
        'Es una cortesía',
        'Te sale más barato',
        'Te lo puedo dejar en menos',
        'Lo pagas por menos',
      ],
      true,
    );
  });

  it('rechaza una oferta con negación en otra cláusula', () => {
    expectAll(
      violatesDiscounts,
      ['No te preocupes, te doy un descuento', 'No sé si aplique, pero tenemos una promoción', 'No; tenemos una oferta'],
      true,
    );
  });

  it('las frases ad hoc y los porcentajes se rechazan aun con negación', () => {
    expectAll(violatesDiscounts, ['No te lo dejo en menos, te lo dejo en $450', 'No hay 10% de descuento'], true);
  });

  it('admite negaciones y textos sin oferta (falsos positivos)', () => {
    expectAll(
      violatesDiscounts,
      [
        'No hay descuentos',
        'No puedo dar descuentos',
        'No hay promociones temporales activas',
        'No tenemos ninguna promoción ni descuento',
        'Nunca ofrecemos rebajas',
        'Sin descuentos: el Plan Estudiante es un plan, no un descuento',
        'Plan Estudiante',
        'Tu visita gratuita',
        'El Trimestral va sin cuota de inscripción',
      ],
      false,
    );
  });

  it('limitación conocida: «No solo te informo: te doy un descuento» se admite (los dos puntos no cortan)', () => {
    expect(violatesDiscounts('No solo te informo: te doy un descuento')).toBe(false);
  });

  it('limitación conocida: mencionar «promociones» sin negación se rechaza (p. ej. la presentación del playbook §2)', () => {
    expect(violatesDiscounts('Te ayudo con información sobre membresías, horarios, servicios y promociones.')).toBe(true);
  });
});

describe('G4: con tema médico, solo el mensaje estándar §8.4 (límite duro 3)', () => {
  it('admite el §8.4 exacto, también con espacios o saltos de línea extra', () => {
    expect(violatesMedical(MEDICAL_NOTICE)).toBe(false);
    expect(violatesMedical(`  \n${MEDICAL_NOTICE.replace(/ /g, '   ').replace('. ', '.\n\n')}\n `)).toBe(false);
  });

  it('rechaza cualquier texto médico distinto del §8.4', () => {
    expectAll(
      violatesMedical,
      [
        'Para tu lesión te recomiendo reposo',
        `${MEDICAL_NOTICE} Mientras tanto, toma mucha agua y descansa.`,
        `Te recomiendo proteína. ${MEDICAL_NOTICE}`,
        MEDICAL_NOTICE.replace('profesional de la salud', 'médico de confianza'),
        MEDICAL_NOTICE.toUpperCase(),
        'Sigue una DIETA balanceada',
        'una dieta sin azucar',
        'Puedes tomar suplementos',
        'Si tienes diabetes, consulta',
        'Cuida tu presión arterial',
      ],
      true,
    );
  });

  it('admite respuestas sin raíz médica', () => {
    expectAll(violatesMedical, ['Entrenamos de lunes a sábado', 'Tenemos clases de funcional'], false);
  });

  it('falso positivo conocido (no deseable): «Hola, Dolores» se rechaza por la raíz dolor', () => {
    expect(hasMedicalRoot('Hola, Dolores')).toBe(true);
    expect(violatesMedical('Hola, Dolores')).toBe(true);
  });

  it('falso positivo conocido (no deseable): «mediciones» casa con la raíz medic', () => {
    expect(violatesMedical('La evaluación física puede incluir mediciones')).toBe(true);
  });
});

describe('checkReply', () => {
  it('devuelve [] para un reply sano o nulo', () => {
    expect(checkReply('¡Hola! Soy Sofía, asistente virtual de Fuerza Gym. ¿En qué te ayudo?', { knowledge: CATALOGO })).toEqual([]);
    expect(checkReply('El Mensual cuesta $499 y la inscripción $199.', { knowledge: CATALOGO })).toEqual([]);
    expect(checkReply(MEDICAL_NOTICE, { knowledge: '' })).toEqual([]);
    expect(checkReply(null, { knowledge: '' })).toEqual([]);
  });

  it('los textos fijos del sistema pasan G1–G4', () => {
    for (const text of [HANDOFF_NOTICE, MEDICAL_NOTICE]) expect(checkReply(text, { knowledge: '' }), text).toEqual([]);
    // EMERGENCY_NOTICE tiene «médica»: no es un reply del agente y el guard no se aplica a los textos fijos.
    expect(checkReply(EMERGENCY_NOTICE, { knowledge: '' }).map((issue) => issue.rule)).toEqual([GUARD_RULES.G4]);
  });

  it('un issue por regla violada, con ruta y regla y sin el texto ni los valores (centinela)', () => {
    const reply = 'CENTINELA: tu pago quedó confirmado, te cuesta $777, te doy un descuento y una dieta';
    const issues = checkReply(reply, { knowledge: CATALOGO });
    expect(issues.map((issue) => issue.rule)).toEqual(['GUARD_G1', 'GUARD_G2', 'GUARD_G3', 'GUARD_G4']);
    for (const issue of issues) {
      expect(issue.path).toBe('reply');
      expect(Object.keys(issue).sort()).toEqual(['message', 'path', 'rule']);
    }
    const serialized = JSON.stringify(issues);
    for (const fragment of ['CENTINELA', '777', 'dieta', 'quedó', 'cuesta']) expect(serialized).not.toContain(fragment);
  });

  it('rechaza un reply que no es texto', () => {
    expect(() => checkReply(42, { knowledge: '' })).toThrow(TypeError);
  });
});
