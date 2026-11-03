import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Las pruebas usan EXCLUSIVAMENTE esta base; test/helpers/db.js se niega a usar otra.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/fuerza-gym-crm-test',
      WA_PROVIDER: 'simulator',
      // Una llamada real al LLM por descuido falla con CONFIG en vez de invocar un modelo (ADR-004).
      LLM_ENGINE: 'cli',
      CLAUDE_CLI_PATH: 'claude-no-disponible-en-pruebas',
    },
    // Comparten una base de datos: los archivos se ejecutan en serie.
    fileParallelism: false,
    hookTimeout: 20000,
  },
});
