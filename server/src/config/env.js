import { z } from 'zod';

// Única puerta de acceso a las variables de entorno (ver CLAUDE.md).
// En desarrollo y pruebas MONGODB_URI tiene un valor local por defecto (SUPUESTOS S36);
// en producción es obligatoria.
export const DEV_MONGODB_URI = 'mongodb://localhost:27017/fuerza-gym-crm';

const emptyToUndefined = (value) => (value === '' ? undefined : value);

// Id completo de modelo (ADR-004): no puede iniciar con '-' porque viaja como argumento del CLI.
export const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:[\]-]{0,99}$/;
const modelId = (fallback) => z.preprocess(emptyToUndefined, z.string().regex(MODEL_ID).default(fallback));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
    MONGODB_URI: z.preprocess(
      emptyToUndefined,
      z.string().regex(/^mongodb(\+srv)?:\/\//, 'debe iniciar con mongodb:// o mongodb+srv://').optional(),
    ),
    WA_PROVIDER: z.enum(['simulator', 'meta']).default('simulator'),
    // Capa LLM (ADR-004). La clave solo se usa con el motor 'api' y nunca llega al CLI.
    LLM_ENGINE: z.preprocess(emptyToUndefined, z.enum(['cli', 'api']).default('cli')),
    CLAUDE_CLI_PATH: z.preprocess(emptyToUndefined, z.string().min(1).default('claude')),
    ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    ANTHROPIC_MODEL_ROUTER: modelId('claude-haiku-5-5'),
    ANTHROPIC_MODEL_AGENTS: modelId('claude-sonnet-5-5'),
  })
  .transform((env, ctx) => {
    // Se acumulan los issues para que uno no oculte al otro.
    let failed = false;
    if (env.LLM_ENGINE === 'api' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['ANTHROPIC_API_KEY'], message: 'es obligatoria con LLM_ENGINE=api' });
      failed = true;
    }
    if (!env.MONGODB_URI && env.NODE_ENV === 'production') {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'es obligatoria en producción' });
      failed = true;
    }
    if (failed) return z.NEVER;
    return env.MONGODB_URI ? env : { ...env, MONGODB_URI: DEV_MONGODB_URI };
  });

export function loadConfig(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${details}`);
  }
  return Object.freeze(result.data);
}

export const config = loadConfig();

// Oculta usuario y contraseña de una cadena de conexión antes de escribirla en logs.
export function redactUri(uri) {
  return uri.replace(/\/\/[^@/]+@/, '//***@');
}

// Copia del entorno para el hijo del CLI de Claude, sin ANTHROPIC_* ni CLAUDE_CODE_USE_*:
// con una clave en el entorno `claude -p` facturaría a la API en vez de usar la suscripción.
// Sin distinguir mayúsculas (en Windows el entorno no lo hace). CLAUDE_CODE_OAUTH_TOKEN se conserva. No modifica el original.
export function cliChildEnv(source = process.env) {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !key.toUpperCase().startsWith('ANTHROPIC_') && !key.toUpperCase().startsWith('CLAUDE_CODE_USE_')),
  );
}
