import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ADR-004 §6: la capa llm/ solo devuelve texto. No toca canales, outbox, datos ni el entorno.
const LLM_DIR = fileURLToPath(new URL('../src/llm', import.meta.url));

// Cubre `from '...'`, `import '...'` (efecto secundario), `import('...')` y `require('...')`.
const FORBIDDEN_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](?:[^'"]*\/)?(?:channels|outbox|models|services|agents|routes)(?:\/[^'"]*)?['"]/;
// process.env, process['env'], `const { env } = process` e importar el módulo process.
const ENV_ACCESS = [
  /\bprocess\s*\.\s*env\b/,
  /\bprocess\s*\[\s*['"`]env['"`]\s*\]/,
  /\{[^}]*\benv\b[^}]*\}\s*=\s*process\b/,
  /\bfrom\s*['"](?:node:)?process['"]/,
];
const usesEnv = (source) => ENV_ACCESS.some((re) => re.test(source));

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : [],
  );
}
const files = listFiles(LLM_DIR).map((file) => relative(LLM_DIR, file).split(sep).join('/'));
const read = (name) => readFileSync(join(LLM_DIR, name), 'utf8');

describe('regla de oro: la capa llm/ es aislada', () => {
  it('existen los archivos de la capa', () => {
    expect([...files].sort()).toEqual(['anthropicApi.js', 'claudeCli.js', 'errors.js', 'index.js', 'schemas.js']);
  });

  it('ningún archivo importa channels, outbox, models, services, agents ni routes', () => {
    expect(files.filter((name) => FORBIDDEN_IMPORT.test(read(name)))).toEqual([]);
  });

  it('ningún archivo accede al entorno del proceso', () => {
    expect(files.filter((name) => usesEnv(read(name)))).toEqual([]);
  });

  it('los detectores reconocen las variantes prohibidas', () => {
    for (const code of [
      "import '../models/index.js';",
      "import { sendMessage } from '../outbox/gate.js';",
      "const x = await import('../channels/index.js');",
      "const m = require('../services/crm.js');",
      "import a from '../../agents/router.js'",
    ]) {
      expect(FORBIDDEN_IMPORT.test(code), code).toBe(true);
    }
    for (const code of ['process.env.X', "process['env'].X", 'const { env } = process;', "import p from 'node:process';"]) {
      expect(usesEnv(code), code).toBe(true);
    }
  });

  it('los detectores no dan falsos positivos con código legítimo', () => {
    for (const code of [
      "import { z } from 'zod';",
      "import Anthropic from '@anthropic-ai/sdk';",
      "import { LlmError } from './errors.js';",
      "import { cliChildEnv } from '../config/env.js';",
      'createClaudeCliEngine({ cliPath, env: cliChildEnv() });',
      'const { cliPath, env, spawnFn } = options;',
    ]) {
      expect(FORBIDDEN_IMPORT.test(code) || usesEnv(code), code).toBe(false);
    }
  });
});
