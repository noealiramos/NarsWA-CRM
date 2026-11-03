import { describe, expect, it } from 'vitest';
import { DEV_MONGODB_URI, cliChildEnv, loadConfig, redactUri } from '../src/config/env.js';

describe('config', () => {
  it('usa valores por defecto de desarrollo', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3001);
    expect(config.MONGODB_URI).toBe(DEV_MONGODB_URI);
    expect(config.WA_PROVIDER).toBe('simulator');
  });

  it('trata una variable vacía como no definida', () => {
    expect(loadConfig({ MONGODB_URI: '' }).MONGODB_URI).toBe(DEV_MONGODB_URI);
  });

  it('exige MONGODB_URI en producción', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI/);
  });

  it('rechaza un puerto o un proveedor inválidos', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ WA_PROVIDER: 'telegram' })).toThrow(/WA_PROVIDER/);
  });

  it('oculta credenciales de la cadena de conexión', () => {
    expect(redactUri('mongodb+srv://user:secreto@cluster.example/db')).toBe('mongodb+srv://***@cluster.example/db');
    expect(redactUri('mongodb://localhost:27017/db')).toBe('mongodb://localhost:27017/db');
  });

  describe('capa LLM', () => {
    it('usa el motor cli y los valores por defecto', () => {
      const config = loadConfig({});
      expect(config.LLM_ENGINE).toBe('cli');
      expect(config.CLAUDE_CLI_PATH).toBe('claude');
      expect(config.ANTHROPIC_MODEL_ROUTER).toBe('claude-haiku-5-5');
      expect(config.ANTHROPIC_MODEL_AGENTS).toBe('claude-sonnet-5-5');
      expect(loadConfig({ LLM_ENGINE: '', CLAUDE_CLI_PATH: '' }).LLM_ENGINE).toBe('cli');
    });

    it('rechaza un motor desconocido', () => {
      expect(() => loadConfig({ LLM_ENGINE: 'openai' })).toThrow(/LLM_ENGINE/);
    });

    it('exige ANTHROPIC_API_KEY solo con el motor api', () => {
      expect(() => loadConfig({ LLM_ENGINE: 'api' })).toThrow(/ANTHROPIC_API_KEY/);
      expect(() => loadConfig({ LLM_ENGINE: 'api', ANTHROPIC_API_KEY: '' })).toThrow(/ANTHROPIC_API_KEY/);
      expect(loadConfig({ LLM_ENGINE: 'api', ANTHROPIC_API_KEY: 'sk-prueba' }).LLM_ENGINE).toBe('api');
      expect(loadConfig({ LLM_ENGINE: 'cli' }).ANTHROPIC_API_KEY).toBeUndefined();
    });

    it('acumula los errores de la clave y de MONGODB_URI en producción', () => {
      expect(() => loadConfig({ NODE_ENV: 'production', LLM_ENGINE: 'api' })).toThrow(
        /ANTHROPIC_API_KEY.*MONGODB_URI|MONGODB_URI.*ANTHROPIC_API_KEY/,
      );
    });

    it('rechaza un modelo con guion inicial', () => {
      expect(() => loadConfig({ ANTHROPIC_MODEL_AGENTS: '--tools' })).toThrow(/ANTHROPIC_MODEL_AGENTS/);
      expect(() => loadConfig({ ANTHROPIC_MODEL_ROUTER: 'a b' })).toThrow(/ANTHROPIC_MODEL_ROUTER/);
    });
  });

  describe('cliChildEnv', () => {
    it('quita ANTHROPIC_* y CLAUDE_CODE_USE_*, conserva el resto y no modifica el original', () => {
      const source = {
        PATH: '/bin',
        ANTHROPIC_API_KEY: 'sk-x',
        ANTHROPIC_MODEL_AGENTS: 'm',
        CLAUDE_CODE_USE_BEDROCK: '1',
        CLAUDE_CODE_OAUTH_TOKEN: 'tok',
      };
      const env = cliChildEnv(source);
      expect(env).toEqual({ PATH: '/bin', CLAUDE_CODE_OAUTH_TOKEN: 'tok' });
      expect(source.ANTHROPIC_API_KEY).toBe('sk-x');
      expect(env).not.toBe(source);
    });

    it('filtra sin distinguir mayúsculas (Windows)', () => {
      const env = cliChildEnv({ Anthropic_Api_Key: 'sk-x', claude_code_use_vertex: '1', Path: 'C:\\bin' });
      expect(env).toEqual({ Path: 'C:\\bin' });
    });
  });
});
