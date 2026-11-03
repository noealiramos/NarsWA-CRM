import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config/env.js';

// La fábrica por defecto de index.js debe pasar al motor cli un entorno sin ANTHROPIC_* ni CLAUDE_CODE_USE_*.
const created = vi.hoisted(() => []);
vi.mock('../src/llm/claudeCli.js', () => ({
  createClaudeCliEngine: (options) => {
    created.push(options);
    return { name: 'cli', generate: async () => ({ text: 'ok', usage: {} }) };
  },
}));

const { createLlm } = await import('../src/llm/index.js');

afterEach(() => vi.unstubAllEnvs());

describe('fábrica por defecto del motor cli', () => {
  it('pasa cliPath de config y un env sin variables de facturación de la API', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-secreta');
    vi.stubEnv('CLAUDE_CODE_USE_BEDROCK', '1');
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'tok');
    const llm = createLlm({ engine: 'cli', config });
    await llm.generate({ system: 'S', messages: [{ role: 'user', content: 'hola' }] }).catch(() => {});
    expect(created).toHaveLength(1);
    const { cliPath, env } = created[0];
    expect(cliPath).toBe(config.CLAUDE_CLI_PATH);
    expect(env).toBeTruthy();
    expect(Object.keys(env).some((k) => /^(ANTHROPIC_|CLAUDE_CODE_USE_)/i.test(k))).toBe(false);
    expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBe('tok');
  });
});
