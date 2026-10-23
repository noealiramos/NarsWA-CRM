import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Regla de oro 1 (CLAUDE.md): ningún mensaje sale a WhatsApp fuera de server/src/outbox/gate.js.
// Verificación estática: solo el gate importa el selector de canal o un adaptador de salida.
const SRC = fileURLToPath(new URL('../src', import.meta.url));
const ALLOWED = new Set(['outbox/gate.js', 'channels/index.js']);
const OUTBOUND_IMPORT = /from\s+['"][^'"]*channels\/(index(\.js)?|[^'"]*outbound(\.js)?)['"]/;

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : [],
  );
}

describe('regla de oro 1: salida única por el outbox', () => {
  it('ningún módulo fuera de outbox/gate.js importa un canal de salida', () => {
    const offenders = listFiles(SRC)
      .map((file) => relative(SRC, file).split(sep).join('/'))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => OUTBOUND_IMPORT.test(readFileSync(join(SRC, file), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('el gate sí usa el selector de canal', () => {
    expect(readFileSync(join(SRC, 'outbox/gate.js'), 'utf8')).toMatch(OUTBOUND_IMPORT);
  });
});
