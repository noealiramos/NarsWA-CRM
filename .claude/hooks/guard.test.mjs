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

// --- Límites de los subagentes (S52) ---
const ROOT = 'D:\\MyDocuments\\2026.wa-crm';
const as = (agentType) => ({ agentType, projectDir: ROOT });
const blockedAs = (agent, tool, input) => assert.notEqual(check(tool, input, as(agent)), null, `${agent} debió bloquear: ${JSON.stringify(input)}`);
const allowedAs = (agent, tool, input) => assert.equal(check(tool, input, as(agent)), null, `${agent} debió permitir: ${JSON.stringify(input)}`);

test('subagentes: cada uno escribe solo en su carpeta', () => {
  allowedAs('arquitecto', 'Write', { file_path: `${ROOT}\\docs\\decisiones\\ADR-003-x.md` });
  allowedAs('arquitecto', 'Edit', { file_path: 'docs/decisiones/ADR-002-seed-en-raiz.md' });
  allowedAs('backend', 'Edit', { file_path: `${ROOT}\\server\\src\\models\\Contact.js` });
  allowedAs('backend', 'Write', { file_path: 'server/test/nuevo.test.js' });
  allowedAs('frontend', 'Edit', { file_path: `${ROOT}\\CLIENT\\src\\App.jsx` });
  for (const p of ['server/src/index.js', 'docs/PRD.md', 'docs/SUPUESTOS.md', '.claude/settings.json', 'CLAUDE.md']) {
    blockedAs('arquitecto', 'Edit', { file_path: p });
  }
  for (const p of ['client/src/App.jsx', 'scripts/seed.js', 'docs/PENDIENTES.md', '.claude/hooks/guard.mjs',
    'package.json', 'server/../scripts/seed.js', 'D:\\otro\\server\\x.js', `${ROOT}\\serverx\\a.js`]) {
    blockedAs('backend', 'Write', { file_path: p });
  }
  blockedAs('frontend', 'Edit', { file_path: 'server/src/index.js' });
  blockedAs('revisor', 'Write', { file_path: 'docs/decisiones/ADR-003-x.md' });
  blockedAs('revisor', 'NotebookEdit', { notebook_path: 'server/x.ipynb' });
  allowedAs('revisor', 'Read', { file_path: 'server/src/index.js' });
});

test('subagentes: sin agent_type (sesión principal) o agente desconocido no se restringe', () => {
  allowed('Edit', { file_path: 'scripts/seed.js' });
  assert.equal(check('Write', { file_path: 'CLAUDE.md' }, as('general-purpose')), null);
  assert.equal(check('Bash', { command: 'git commit -m "x"' }, as('general-purpose')), null);
});

test('subagentes: no modifican git, no instalan paquetes ni corren el seed', () => {
  for (const agent of ['arquitecto', 'backend', 'frontend', 'revisor']) {
    for (const command of ['git add .', 'git commit -m "x"', 'git -C . commit -am x', 'git reset --hard',
      'git checkout -- server', 'git stash', 'npm install zod', 'npm i -D x', 'npm ci', 'npx vitest',
      'npm uninstall zod', 'npm run seed', 'node scripts/seed.js', 'npm test && git add -A',
      'npm run-script seed', 'npm run -s seed', 'npm run --silent seed', 'npm rum seed', 'npm urn seed',
      'npm -w server run seed', 'npm.cmd run seed', 'node scripts/seed', 'node ./scripts/seed',
      'node --env-file-if-exists=x scripts\\seed']) {
      blockedAs(agent, 'Bash', { command });
      blockedAs(agent, 'PowerShell', { command });
    }
  }
  for (const agent of ['backend', 'frontend']) {
    for (const command of ['npm test -w server', 'npm run build -w client', 'git status', 'git diff --stat',
      'node --test .claude/hooks/guard.test.mjs', 'npm test -w server -- -t "add contact"', 'npm test -- -t x',
      'npm run test -w server -- seed', 'npm test -w server -- test/seed.test.js', 'node scripts/seeder.js']) {
      allowedAs(agent, 'Bash', { command });
    }
    blockedAs(agent, 'Bash', { command: 'npm -w server install zod' });
  }
});

test('subagentes: el revisor solo ejecuta comandos de lectura', () => {
  for (const command of ['git status', 'git diff --stat', 'git --no-pager log --oneline -5', 'git show 0da2f39',
    'git diff 2>&1 | head -50', 'npm test', 'npm test -w server', 'node --test .claude/hooks/guard.test.mjs',
    'git diff -- CLAUDE.md | wc -l', 'grep -n zod server/src/config/env.js', 'ls 2>/dev/null',
    'cat scripts/seed.js', 'git diff -- scripts/seed.js', 'npm test -w server', 'npm run test -w server -- seed',
    'npm test -w server -- test/seed.test.js', 'git status --short 2>/dev/null', 'ls D:/MyDocuments/2026.wa-crm/docs']) {
    allowedAs('revisor', 'Bash', { command });
  }
  for (const command of ['echo x > server/a.js', 'git diff >> out.txt', 'git diff --output=x.patch', 'cat a | tee b',
    'rm -rf server', 'node -e "require(\'fs\').writeFileSync(\'a\',\'b\')"', 'sed -i s/a/b/ x.js', 'cp a b',
    'git log $(rm x)', 'find . -delete', 'find . -exec rm {} ;', 'npm run dev', 'mkdir x', 'touch x',
    'pwd & true', 'git status & rm -rf server', 'cat x & touch y', 'sed -n -i s/a/b/ x.js', 'sed -n "w out" x',
    'find . -okdir rm {} ;', 'rg --pre ./x foo', 'sort -o out in', 'uniq in out', 'git grep -Ovim foo',
    'node --test scripts/seed.js', 'node --test --import data:text/javascript,x .claude/hooks/guard.test.mjs',
    'npm test -- --outputFile=x.json', 'npm test -- -u', 'npm test -- --update',
    // Redirecciones disfrazadas y flags reconstruidos por el shell.
    'echo hola >$null/d/x/CLAUDE.md', 'ls >&1out', 'ls 2>/dev/null/../x', 'find . "-delete"', 'find . -de\'\'lete',
    'find . -${HOME:+delete}', 'find . -{delete,true}', 'find server -name x', 'git diff --out\'\'put=x',
    'git diff --${HOME:+output}=x', 'npm test -- "-u"', 'npm test -- --up\'\'date', 'cat a\\ b', 'ls *',
    // Argumentos de npm o Vitest que ejecutan código o cambian de proyecto.
    'npm test -- --setupFiles=x.js', 'npm test -w server -- --globalSetup x.js', 'npm test --prefix x',
    'npm test -w otro', 'cd .. && npm test', 'cat/x', 'ls.x']) {
    blockedAs('revisor', 'Bash', { command });
  }
});

test('proceso: lee agent_type de la entrada del hook', () => {
  const script = fileURLToPath(new URL('./guard.mjs', import.meta.url));
  const run = (input) => spawnSync(process.execPath, [script], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
  });
  const denied = run({ tool_name: 'Write', agent_type: 'backend', tool_input: { file_path: `${ROOT}\\docs\\PRD.md` } });
  assert.equal(denied.status, 2);
  assert.match(denied.stderr, /backend solo puede escribir en server\//);
  assert.equal(run({ tool_name: 'Write', agent_type: 'backend', tool_input: { file_path: `${ROOT}\\server\\a.js` } }).status, 0);
  assert.equal(run({ tool_name: 'Write', tool_input: { file_path: `${ROOT}\\docs\\PRD.md` } }).status, 0);
});
