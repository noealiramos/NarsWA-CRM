import { describe, expect, it } from 'vitest';
import { DEV_MONGODB_URI, loadConfig, redactUri } from '../src/config/env.js';

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
});
