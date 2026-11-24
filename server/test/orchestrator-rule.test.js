import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ADR-005 §1 y criterio de aceptación del paso 1: los módulos puros del orquestador no envían, no escriben en la base,
// no emiten eventos ni leen el entorno. Estilo de llm-rule.test.js.
const AGENTS_DIR = fileURLToPath(new URL('../src/agents', import.meta.url));

// Módulos puros que existen en cada entrega. 1b agrega 'context.js'; 1c agrega 'history.js' y 'orchestrator.js'.
const PURE_MODULES = ['escalationTypes.js', 'noticeTexts.js', 'contract.js', 'replyGuard.js', 'context.js', 'history.js', 'orchestrator.js'];
// Módulos sin ninguna dependencia: solo declaran constantes.
const NO_IMPORT_MODULES = ['noticeTexts.js'];

// Cubre `from '...'`, `import '...'` (efecto secundario), `import('...')` y `require('...')`.
const FORBIDDEN_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](?:[^'"]*\/)?(?:channels|outbox|models|services|routes|realtime)(?:\/[^'"]*)?['"]/;
// process.env, process['env'], `const { env } = process` e importar el módulo process.
const ENV_ACCESS = [
  /\bprocess\s*\.\s*env\b/,
  /\bprocess\s*\[\s*['"`]env['"`]\s*\]/,
  /\{[^}]*\benv\b[^}]*\}\s*=\s*process\b/,
  /\bfrom\s*['"](?:node:)?process['"]/,
];
const usesEnv = (source) => ENV_ACCESS.some((re) => re.test(source));
// Cualquier dependencia: import estático o dinámico, import.meta, require o reexportación desde otro módulo.
const ANY_IMPORT = [
  /^\s*import\b/m,
  /\bimport\s*\(/,
  /\bimport\s*\.\s*meta\b/,
  /\brequire\s*\(/,
  /\bexport\s+(?:\*|\{[^}]*\})\s*from\b/,
];
const hasImport = (source) => ANY_IMPORT.some((re) => re.test(source));

const read = (name) => readFileSync(join(AGENTS_DIR, name), 'utf8');

describe('regla de oro: los módulos puros del orquestador no tienen efectos', () => {
  it('existen todos los módulos puros de esta entrega', () => {
    for (const name of PURE_MODULES) expect(existsSync(join(AGENTS_DIR, name)), name).toBe(true);
  });

  it('ninguno importa channels, outbox, models, services, routes ni realtime', () => {
    expect(PURE_MODULES.filter((name) => FORBIDDEN_IMPORT.test(read(name)))).toEqual([]);
  });

  it('ninguno accede al entorno del proceso', () => {
    expect(PURE_MODULES.filter((name) => usesEnv(read(name)))).toEqual([]);
  });

  it('noticeTexts.js no tiene ningún import (solo constantes)', () => {
    expect(NO_IMPORT_MODULES.filter((name) => hasImport(read(name)))).toEqual([]);
  });

  it('los detectores reconocen las variantes prohibidas', () => {
    for (const code of [
      "import '../models/index.js';",
      "import { sendMessage } from '../outbox/gate.js';",
      "const x = await import('../channels/index.js');",
      "const m = require('../services/crm.js');",
      "import { router } from '../routes/simulator.js';",
      "import { emit } from '../realtime/index.js';",
    ]) {
      expect(FORBIDDEN_IMPORT.test(code), code).toBe(true);
    }
    for (const code of ['process.env.X', "process['env'].X", 'const { env } = process;', "import p from 'node:process';"]) {
      expect(usesEnv(code), code).toBe(true);
    }
    for (const code of [
      "import { z } from 'zod';",
      "export { A } from './a.js';",
      "export * from './a.js';",
      "const a = await import('./a.js');",
      'const url = import.meta.url;',
    ]) {
      expect(hasImport(code), code).toBe(true);
    }
  });

  it('los detectores no dan falsos positivos con código legítimo', () => {
    for (const code of [
      "import { z } from 'zod';",
      "import { MEDICAL_NOTICE } from './noticeTexts.js';",
      "import { ESCALATION_TYPES } from './escalationTypes.js';",
      "import { generate } from '../llm/index.js';",
      'const { env, model } = options;',
    ]) {
      expect(FORBIDDEN_IMPORT.test(code) || usesEnv(code), code).toBe(false);
    }
    for (const code of ["// Módulo sin dependencias: no importa nada.", "export const A = 'importante';"]) {
      expect(hasImport(code), code).toBe(false);
    }
  });
});
