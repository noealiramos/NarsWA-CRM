import { describe, expect, it } from 'vitest';
import { caseSchema, parseConversationCases } from './helpers/conversationCases.js';

const base = () => ({ id: 'sintetico', description: 'Caso sintético del esquema',
  messages: [{ role: 'user', content: 'Hola' }], expect: { action: 'NINGUNA', handoffTarget: null,
    escalation: null, replyNull: false, mustMatch: [], mustNotMatch: [] } });

describe('contrato de casos, sin ejecutar evals ni llamar a un modelo', () => {
  it('mantiene compatibles los casos aislados y exige acción en ellos', () => {
    expect(caseSchema.parse(base()).expect.mode).toBe('AISLADO');
    const item = base(); item.expect.action = null;
    expect(caseSchema.safeParse(item).success).toBe(false);
  });
  it('action nulo exige integración, causa y resultado seguro coherente', () => {
    const item = base();
    Object.assign(item.expect, { mode: 'INTEGRACION', action: null, cause: 'DESTINO_INEXISTENTE',
      replyNull: true, escalation: 'FUERA_DE_CONOCIMIENTO' });
    expect(caseSchema.safeParse(item).success).toBe(true);
    delete item.expect.cause;
    expect(caseSchema.safeParse(item).success).toBe(false);
  });
  it('no acepta integración implícita ni ids repetidos', () => {
    expect(() => parseConversationCases([base()], { integration: true })).toThrow(/explícito/);
    expect(() => parseConversationCases([base(), base()])).toThrow(/repetidos/);
  });
  it('valida regex de forbidden, ejemplos positivos/negados y el límite declarado', () => {
    const item = base();
    item.expect.hardLimit = ['DESCUENTOS'];
    item.expect.forbidden = [{ pattern: '(?<!no )te doy un descuento', limit: 'DESCUENTOS',
      matches: ['Te doy un descuento'], misses: ['No te doy un descuento', 'Plan Estudiante'] }];
    expect(caseSchema.safeParse(item).success).toBe(true);
    item.expect.forbidden[0].misses = ['Te doy un descuento'];
    expect(caseSchema.safeParse(item).success).toBe(false);
    item.expect.forbidden[0].misses = ['No te doy un descuento'];
    item.expect.hardLimit = ['PAGOS'];
    expect(caseSchema.safeParse(item).success).toBe(false);
  });
  it('mantiene mustNotMatch separado de los patrones prohibidos', () => {
    const item = base(); item.expect.mustNotMatch = ['rebaja'];
    expect(caseSchema.parse(item).expect.forbidden).toBeUndefined();
    item.expect.mustNotMatch = ['['];
    expect(caseSchema.safeParse(item).success).toBe(false);
  });
  it('rechaza expectativas antiguas de emergencia y acepta el aviso del sistema', () => {
    const item = base();
    Object.assign(item.expect, { action: 'ESCALAR', handoffTarget: 'humano', escalation: 'EMERGENCIA', mustMatch: ['911'] });
    expect(caseSchema.safeParse(item).success).toBe(false);
    Object.assign(item.expect, { replyNull: true, mustMatch: [], noticeKind: 'EMERGENCIA', noticeMustMatch: ['911'] });
    expect(caseSchema.safeParse(item).success).toBe(true);
  });
  it('valida priceClaims sin adjudicarse evaluar todavía las respuestas', () => {
    const item = base();
    item.expect.priceClaims = [{ concept: 'Mensual', pattern: 'Mensual', amounts: [499] }];
    expect(caseSchema.safeParse(item).success).toBe(true);
    item.expect.priceClaims[0].amounts = [];
    expect(caseSchema.safeParse(item).success).toBe(false);
  });
});
