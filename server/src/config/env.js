import { z } from 'zod';

// Única puerta de acceso a las variables de entorno (ver CLAUDE.md).
// En desarrollo y pruebas MONGODB_URI tiene un valor local por defecto (SUPUESTOS S36);
// en producción es obligatoria.
export const DEV_MONGODB_URI = 'mongodb://localhost:27017/fuerza-gym-crm';

const emptyToUndefined = (value) => (value === '' ? undefined : value);

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
  })
  .transform((env, ctx) => {
    if (env.MONGODB_URI) return env;
    if (env.NODE_ENV === 'production') {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'es obligatoria en producción' });
      return z.NEVER;
    }
    return { ...env, MONGODB_URI: DEV_MONGODB_URI };
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
