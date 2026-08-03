import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  HTTP_BODY_LIMIT: z.string().default('1mb'),
})

export type AppEnv = z.infer<typeof envSchema>

/** Valida la configuración antes de abrir conexiones o atender tráfico. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Configuración inválida: ${details}`)
  }

  const databaseUrl = new URL(parsed.data.DATABASE_URL)
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL debe usar el protocolo postgresql://')
  }
  if (
    !databaseUrl.username ||
    !databaseUrl.password ||
    databaseUrl.username === 'USER' ||
    databaseUrl.password === 'PASSWORD'
  ) {
    throw new Error('DATABASE_URL debe tener credenciales reales de PostgreSQL')
  }

  return parsed.data
}
