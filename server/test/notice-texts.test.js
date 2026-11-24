import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMERGENCY_NOTICE, HANDOFF_NOTICE, MEDICAL_NOTICE } from '../src/agents/noticeTexts.js';
import { getAgent } from '../src/agents/registry.js';

// ADR-005 §4 y §9, ADR-006 §2: los textos fijos son copia literal del playbook; si el playbook cambia, esta prueba falla.
const PLAYBOOK = readFileSync(fileURLToPath(new URL('../../docs/negocio/playbook-ventas.md', import.meta.url)), 'utf8');

// Texto de una sección: desde su encabezado hasta el siguiente encabezado de nivel igual o superior.
function section(heading) {
  const lines = PLAYBOOK.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(heading));
  expect(start, `no existe la sección ${heading}`).toBeGreaterThanOrEqual(0);
  const level = heading.match(/^#+/)[0].length;
  const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

// Citas con el formato del playbook: `> "…"` (misma técnica que agents.test.js).
const quotes = (text) => [...text.matchAll(/> "([^"]+)"/g)].map((match) => match[1]);

describe('textos fijos del playbook (noticeTexts.js)', () => {
  it('HANDOFF_NOTICE es el aviso de canalización de §2', () => {
    const found = quotes(section('## 2. ')).filter((quote) => quote.startsWith('Con gusto voy a canalizar'));
    expect(found).toHaveLength(1);
    expect(HANDOFF_NOTICE).toBe(found[0]);
  });

  it('EMERGENCY_NOTICE es el aviso del 911 de §6 (viñeta 2 de EMERGENCIA)', () => {
    const found = quotes(section('## 6. ')).filter((quote) => quote.startsWith('Si estás ante una emergencia médica'));
    expect(found).toHaveLength(1);
    expect(EMERGENCY_NOTICE).toBe(found[0]);
  });

  it('MEDICAL_NOTICE es el mensaje estándar médico de §8.4', () => {
    const found = quotes(section('### 8.4 '));
    expect(found).toHaveLength(1);
    expect(MEDICAL_NOTICE).toBe(found[0]);
  });

  it('los prompts de recepcion y ventas siguen conteniendo EMERGENCY_NOTICE literal', () => {
    for (const name of ['recepcion', 'ventas']) {
      expect(readFileSync(getAgent(name).promptPath, 'utf8'), name).toContain(EMERGENCY_NOTICE);
    }
  });
});
