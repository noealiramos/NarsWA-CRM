#!/usr/bin/env node
// Hook PreToolUse de Claude Code: bloquea el acceso a archivos .env y cualquier `git push`.
// Complementa las reglas `permissions.deny` de .claude/settings.json, que no cubren comandos
// de shell (por ejemplo `node -e` leyendo .env). Es defensa en profundidad, NO es infalible:
// ver las limitaciones en docs/SUPUESTOS.md (S37 y S52).
//
// Además aplica los límites de los subagentes de `.claude/agents/` (campo `agent_type` de la
// entrada del hook): carpetas donde cada uno puede escribir y comandos de shell que no puede usar.
//
// Protocolo: recibe el JSON del hook por stdin. Sale con 0 para permitir y con 2 para bloquear
// (el mensaje de stderr se devuelve a Claude).
import { readFileSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const WRITE_TOOLS = { Edit: 'file_path', MultiEdit: 'file_path', Write: 'file_path', NotebookEdit: 'notebook_path' };

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

// --- Límites de los subagentes (S52) ---

// Carpetas (relativas a la raíz del proyecto) donde cada subagente puede escribir con
// Edit/Write. El revisor no escribe en ninguna.
const AGENT_WRITE_ROOTS = {
  arquitecto: ['docs/decisiones/'],
  backend: ['server/'],
  frontend: ['client/'],
  revisor: [],
};

// Subcomandos de git que modifican el repositorio. Prefiere falsos positivos: basta con que
// la palabra aparezca en el segmento de un comando git.
const GIT_MUTATING = /\bgit(\.exe)?\b[^;&|\n]*\b(add|commit|reset|checkout|switch|restore|stash|clean|rebase|merge|cherry-pick|revert|tag|branch|rm|mv|am|apply|pull|fetch|clone|config|init|worktree|update-ref|update-index|notes|gc|prune|filter-branch|submodule)\b/i;
// Instalar, quitar o ejecutar paquetes, y correr el seed (escribe en la base de desarrollo).
// El subcomando se busca justo después de `npm` y sus flags (`npm -w server install`), no en cualquier
// argumento, para no bloquear `npm test -- -t "add contact"`.
const NPM_MUTATING = /\b(npm|pnpm|yarn)(\.cmd)?\s+(-\S+(\s+[^-\s]\S*)?\s+)*(install|i|ci|add|uninstall|un|remove|rm|update|up|upgrade|link|publish|exec|x|dlx|audit\s+fix|dedupe|prune)\b|\bnpx\b/i;
// El seed: `run` y sus alias (`run-script`, `rum`, `urn`) con flags antes o después (`npm run -s seed`),
// y `node scripts/seed` con o sin `.js`. `npm run test -- seed` no coincide: `seed` no es el script.
const SEED_RUN = /\bnpm(\.cmd)?\s+(-\S+(\s+[^-\s]\S*)?\s+)*(run|run-script|rum|urn)\s+(-\S+(\s+[^-\s]\S*)?\s+)*seed\b|\bnode(\.exe)?\b[^;&|\n]*\bscripts[\\/]seed(\.js)?\b/i;

// El revisor solo puede ejecutar estos comandos (cada segmento separado por `&&`, `||`, `&`, `;` o `|`).
// Se excluyen a propósito los que pueden escribir o ejecutar programas: `sed` (`-i`, `w`, `e`), `sort -o`,
// `uniq` (archivo de salida), `rg --pre`, `git grep -O`, `find` (`-delete`, `-exec`) y `cd` (cambiaría qué
// `package.json` ejecuta `npm test`). Para buscar archivos o texto tiene Glob y Grep.
const REVIEWER_COMMANDS = [
  /^git(\.exe)?\s+(--no-pager\s+)?(status|diff|log|show|blame|ls-files|rev-parse|shortlog)(?=\s|$)/i,
  // Solo las formas exactas: otros argumentos de npm o Vitest (`--setupFiles`, `--config`, `--prefix`)
  // ejecutan código o escriben archivos. Los filtros de archivo tras `--` no pueden empezar con `-`.
  /^npm(\.cmd)?\s+(run\s+)?test(\s+(-w|--workspace)[\s=](server|client))?(\s+--(\s+[\w./][\w./-]*)+)?$/i,
  /^node(\.exe)?\s+--test\s+\.claude\/hooks\/[\w.-]+\.test\.mjs$/i,
  /^(ls|cat|head|tail|wc|grep|pwd|echo|cut|diff|stat|which)(?=\s|$)/,
];
// Redirecciones permitidas al revisor (descartan o unen salidas). Deben terminar ahí: `>&1out` o
// `2>/dev/null/../x` sí escribirían un archivo.
const SAFE_REDIRECTS = /(^|\s)\d?>&[12](?=\s|$)|(^|\s)\d?>\s*\/dev\/null(?=\s|$)/g;
// Tras quitar esas redirecciones, el comando solo puede tener estos caracteres (más los separadores).
// Así se descartan comillas, `\`, `$`, llaves, comodines, paréntesis y `<`/`>`, con los que el shell
// reconstruye flags prohibidos (`-de''lete`, `--${X:+output}`, `-{delete,true}`) o redirige a archivos.
const REVIEWER_CHARS = /^[\w ./:@^~=,+&|;\n-]*$/;
// Flags que escriben archivos o actualizan snapshots.
const REVIEWER_FORBIDDEN = /\btee\b|--output\w*|--update\b|(^|\s)-u\b/;

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

// Ruta relativa a la raíz del proyecto con `/`, o null si queda fuera de ella.
export function projectRelative(filePath, projectDir) {
  if (typeof filePath !== 'string' || filePath === '') return null;
  const rel = relative(resolve(projectDir), resolve(projectDir, filePath)).replace(/\\/g, '/');
  if (rel === '' || rel.startsWith('../') || rel === '..' || isAbsolute(rel)) return null;
  return rel;
}

function checkAgentWrite(agent, filePath, projectDir) {
  const roots = AGENT_WRITE_ROOTS[agent];
  const rel = projectRelative(filePath, projectDir);
  // Windows no distingue mayúsculas en rutas.
  const target = rel?.toLowerCase();
  if (target && roots.some((root) => target.startsWith(root))) return null;
  const allowed = roots.length ? roots.join(', ') : 'ninguna carpeta (solo lectura)';
  return `el subagente ${agent} solo puede escribir en ${allowed}; "${filePath}" queda fuera. Repórtalo a la sesión principal.`;
}

function checkReviewerCommand(command) {
  const stripped = command.replace(SAFE_REDIRECTS, ' ');
  if (!REVIEWER_CHARS.test(stripped) || REVIEWER_FORBIDDEN.test(stripped)) {
    return 'el revisor es de solo lectura: sus comandos no pueden llevar comillas, `$`, `\\`, llaves, comodines, paréntesis, redirecciones a archivo, `tee`, `--output` ni `-u`/`--update`. Usa rutas con `/` y, para buscar o leer, las herramientas Grep, Glob o Read.';
  }
  const segments = stripped.split(/&&|\|\||[;&|\n]/).map((s) => s.trim()).filter(Boolean);
  const denied = segments.find((s) => !REVIEWER_COMMANDS.some((re) => re.test(s)));
  if (denied) return `el revisor es de solo lectura y no puede ejecutar "${denied}". Para buscar o leer usa las herramientas Grep o Read.`;
  return null;
}

export function checkAgentCommand(agent, command) {
  if (GIT_MUTATING.test(command)) {
    return `el subagente ${agent} no ejecuta comandos de git que modifican el repositorio (add, commit, reset, checkout…). Los commits los hace la sesión principal.`;
  }
  if (SEED_RUN.test(command)) {
    return `el subagente ${agent} no ejecuta el seed: escribe en la base de desarrollo y lo coordina la sesión principal (ADR-002).`;
  }
  if (NPM_MUTATING.test(command)) {
    return `el subagente ${agent} no instala, quita ni ejecuta paquetes (npm install, npx…). Propón el cambio en tu reporte.`;
  }
  if (agent === 'revisor') return checkReviewerCommand(command);
  return null;
}

export function check(toolName, toolInput = {}, context = {}) {
  const { agentType, projectDir = process.cwd() } = context;
  if (SHELL_TOOLS.has(toolName)) {
    const command = String(toolInput.command ?? '');
    const reason = checkCommand(command);
    if (reason || !Object.hasOwn(AGENT_WRITE_ROOTS, agentType ?? '')) return reason;
    return checkAgentCommand(agentType, command);
  }
  for (const field of PATH_FIELDS[toolName] ?? []) {
    if (isEnvPath(toolInput[field])) {
      return `acceso a "${toolInput[field]}" denegado: los archivos .env no se leen ni se modifican desde Claude.`;
    }
  }
  if (Object.hasOwn(WRITE_TOOLS, toolName) && Object.hasOwn(AGENT_WRITE_ROOTS, agentType ?? '')) {
    return checkAgentWrite(agentType, toolInput[WRITE_TOOLS[toolName]], projectDir);
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
  const reason = check(input.tool_name, input.tool_input ?? {}, {
    agentType: input.agent_type,
    projectDir: process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd(),
  });
  if (reason) block(reason);
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
