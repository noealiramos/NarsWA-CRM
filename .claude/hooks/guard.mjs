#!/usr/bin/env node
// Hook PreToolUse de Claude Code: bloquea el acceso a archivos .env y cualquier `git push`.
// Complementa las reglas `permissions.deny` de .claude/settings.json, que no cubren comandos
// de shell (por ejemplo `node -e` leyendo .env). Es defensa en profundidad, NO es infalible:
// ver las limitaciones en docs/SUPUESTOS.md.
//
// Protocolo: recibe el JSON del hook por stdin. Sale con 0 para permitir y con 2 para bloquear
// (el mensaje de stderr se devuelve a Claude).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

// Campos que contienen rutas o globs por herramienta. En Grep no se revisa `pattern`
// porque es el texto a buscar, no una ruta.
const PATH_FIELDS = {
  Read: ['file_path'],
  Edit: ['file_path'],
  MultiEdit: ['file_path'],
  Write: ['file_path'],
  NotebookEdit: ['notebook_path'],
  Grep: ['path', 'glob'],
  Glob: ['pattern', 'path'],
};

const ALLOWED_ENV_FILES = new Set(['.env.example']);

// `.env` como palabra suelta en un comando (no `process.env`, `config.env` ni `.envrc`),
// excepto `.env.example`.
const ENV_FILE_IN_COMMAND = /(^|[^\w.-])\.env(?![\w-])(?!\.example(?![\w.-]))/i;
// Comodines que pueden expandirse a .env: `.e*`, `.en?`, `.env[...]`.
const ENV_GLOB_IN_COMMAND = /(^|[^\w.-])\.e(n(v)?)?[*?[]/i;
// Cargar .env en un proceso que imprime o evalúa código.
const NODE_ENV_FILE_FLAG = /--env-file/i;
const DOTENV_WITH_EVAL = /\bdotenv\b[\s\S]*\s(-e|-p|-r|--eval|--print|--require)\b|\s(-e|-p|-r|--eval|--print|--require)\b[\s\S]*\bdotenv\b/;

// `git ... push` dentro del mismo segmento de comando (cubre `git -C . push`,
// `git -c x=y push`, `git.exe push`, `bash -c "git push"`, `Start-Process git -ArgumentList push`).
const GIT_PUSH = /\bgit(\.exe)?\b[^;&|\n]*\bpush\b/i;
const GIT_SEND_PACK = /\bgit(\.exe)?\b[^;&|\n]*\bsend-pack\b/i;
// Comandos de GitHub CLI que publican código.
const GH_PUBLISH = /\bgh(\.exe)?\b[^;&|\n]*(\bpr\s+create\b|\brepo\s+sync\b|--push\b)/i;

export function isEnvPath(value) {
  if (typeof value !== 'string' || value === '') return false;
  const name = basename(value.replace(/\\/g, '/')).toLowerCase();
  if (ALLOWED_ENV_FILES.has(name)) return false;
  return /^\.env($|[.*?[{])/.test(name);
}

export function checkCommand(command) {
  if (ENV_FILE_IN_COMMAND.test(command) || ENV_GLOB_IN_COMMAND.test(command)) {
    return 'el comando menciona un archivo .env. Los .env no se leen ni se modifican desde Claude; revísalos tú manualmente.';
  }
  if (NODE_ENV_FILE_FLAG.test(command) || DOTENV_WITH_EVAL.test(command)) {
    return 'el comando carga variables de entorno desde un archivo .env para evaluar o imprimir código.';
  }
  if (GIT_PUSH.test(command) || GIT_SEND_PACK.test(command) || GH_PUBLISH.test(command)) {
    return 'publicar en el remoto (git push y equivalentes) está prohibido en este proyecto. Si un mensaje de commit contiene la palabra "push", reformúlalo.';
  }
  return null;
}

export function check(toolName, toolInput = {}) {
  if (SHELL_TOOLS.has(toolName)) return checkCommand(String(toolInput.command ?? ''));
  for (const field of PATH_FIELDS[toolName] ?? []) {
    if (isEnvPath(toolInput[field])) {
      return `acceso a "${toolInput[field]}" denegado: los archivos .env no se leen ni se modifican desde Claude.`;
    }
  }
  return null;
}

function block(reason) {
  process.stderr.write(`[guard] Bloqueado: ${reason}\n`);
  process.exit(2);
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    block('no se pudo leer la entrada del hook (se bloquea por seguridad).');
  }
  const reason = check(input.tool_name, input.tool_input ?? {});
  if (reason) block(reason);
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
