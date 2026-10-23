// Pruebas del hook guard.mjs con node:test (sin dependencias).
// Ejecutar: node --test .claude/hooks/guard.test.mjs
// Solo se evalúan cadenas: ninguna prueba ejecuta comandos ni lee archivos .env.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check } from './guard.mjs';

const blocked = (tool, input) => assert.notEqual(check(tool, input), null, `debió bloquear: ${JSON.stringify(input)}`);
const allowed = (tool, input) => assert.equal(check(tool, input), null, `debió permitir: ${JSON.stringify(input)}`);

test('herramientas de archivos: bloquea .env y variantes', () => {
  for (const p of ['.env', './.env', 'D:\\MyDocuments\\2026.wa-crm\\.env', 'server/.env', '.env.local',
    '.env.production', '.env.test', '.env.staging', '.ENV']) {
    blocked('Read', { file_path: p });
    blocked('Edit', { file_path: p });
    blocked('Write', { file_path: p });
  }
  blocked('Glob', { pattern: '**/.env*' });
  blocked('Grep', { pattern: 'API_KEY', path: '.env' });
  blocked('Grep', { pattern: 'x', glob: '.env.*' });
});

test('herramientas de archivos: permite .env.example y archivos normales', () => {
  allowed('Read', { file_path: '.env.example' });
  allowed('Edit', { file_path: 'server/.env.example' });
  allowed('Read', { file_path: 'server/src/config/env.js' });
  allowed('Read', { file_path: '.envrc' });
  allowed('Read', { file_path: 'docs/PRD.md' });
  allowed('Grep', { pattern: '\\.env', path: 'docs' });
});

test('shell: bloquea lecturas de .env por cualquier comando', () => {
  for (const command of [
    'cat .env', 'type .env', 'Get-Content .env', 'gc ./.env', 'more "server/.env"',
    'node -e "console.log(require(\'fs\').readFileSync(\'.env\',\'utf8\'))"',
    'cp .env /tmp/x', 'cat .env.local', 'cat .e*', 'cat .en?', 'ls .env*',
    'node --env-file=x.cfg -e "console.log(process.env)"',
    'node -r dotenv/config -e "console.log(process.env)"',
  ]) {
    blocked('Bash', { command });
    blocked('PowerShell', { command });
  }
});

test('shell: permite comandos legítimos', () => {
  for (const command of [
    'npm run dev', 'npm test -w server', 'npm install dotenv zod', 'git status', 'git diff --stat',
    'git add docs/PRD.md', 'git commit -m "docs: actualiza PRD"', 'git log --oneline -5',
    'node -e "console.log(process.env.NODE_ENV)"', 'cat .env.example', 'cp .env.example /tmp/plantilla',
  ]) {
    allowed('Bash', { command });
  }
});

test('shell: bloquea git push y variantes', () => {
  for (const command of [
    'git push', 'git push origin master', 'git push --force', 'git -C . push', 'git -c core.x=y push',
    'git.exe push', 'git status && git push', 'git status; git push', 'bash -c "git push"',
    'cmd /c git push', 'Start-Process git -ArgumentList push', '& git push origin master',
    'GIT_TRACE=1 git push', 'git send-pack origin', 'gh pr create --fill', 'gh repo sync',
    'gh repo create x --source . --push',
  ]) {
    blocked('Bash', { command });
    blocked('PowerShell', { command });
  }
});

test('shell: no confunde push fuera de git', () => {
  allowed('Bash', { command: 'git log | grep push' });
  allowed('Bash', { command: 'echo push' });
  allowed('Bash', { command: 'pushd server' });
});

test('proceso: exit 2 al bloquear, exit 0 al permitir, exit 2 con entrada inválida', () => {
  const script = fileURLToPath(new URL('./guard.mjs', import.meta.url));
  const run = (stdin) => spawnSync(process.execPath, [script], { input: stdin, encoding: 'utf8' });
  const deny = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push' } }));
  assert.equal(deny.status, 2);
  assert.match(deny.stderr, /\[guard\] Bloqueado/);
  assert.equal(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } })).status, 0);
  assert.equal(run('esto no es json').status, 2);
});
