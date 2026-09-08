import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  HTTP_BODY_LIMIT: z.string().default('1mb'),
  INTERNAL_TESTING: z.enum(['true', 'false']).default('false'),
  INTERNAL_TESTER_EMAILS: z.string().default(''),
  INTERNAL_BOTS_AVAILABLE: z.enum(['true', 'false']).default('false'),
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
  if (parsed.data.NODE_ENV === 'production' && parsed.data.INTERNAL_TESTING !== 'true') {
    throw new Error('Este MVP solo puede desplegarse con INTERNAL_TESTING=true y testers autorizados')
  }
  if (
    parsed.data.INTERNAL_TESTING === 'true' &&
    (source.DEMO_RIDE_BOT_ENABLED === 'true' || source.DEMO_SHIPMENT_BOT_ENABLED === 'true')
  ) {
    throw new Error('El MVP interno requiere cuentas de testers: deshabilitá los bots demo')
  }
  if (parsed.data.INTERNAL_TESTING === 'true' && !parsed.data.INTERNAL_TESTER_EMAILS.split(',').some(email => z.string().email().safeParse(email.trim()).success)) {
    throw new Error('INTERNAL_TESTER_EMAILS debe incluir las cuentas autorizadas para pruebas')
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.INTERNAL_TESTING !== 'true' && source.DIDIT_BYPASS_VERIFICATION === 'true') {
    throw new Error('El bypass de verificación solo se permite en desarrollo o pruebas internas restringidas')
  }
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
