import express from 'express'
import cors from 'cors'
import router from './routes'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import prisma from './lib/prisma'

const app = express()
const DIDIT_WEBHOOK_PATH = '/api/v1/drivers/verification/webhook'
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

// ── Middleware ─────────────────────────────────────────────
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({
  origin(origin, callback) {
    // Las apps nativas no siempre envían Origin; los navegadores sí se validan.
    if (!origin || corsOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origen no permitido por CORS'))
  },
  credentials: true,
}))
app.use(requestLogger)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})

app.use(express.json({
  limit: process.env.HTTP_BODY_LIMIT || '1mb',
  verify: (req, _res, buf) => {
    const requestPath = req.url?.split('?')[0]
    if (requestPath === DIDIT_WEBHOOK_PATH) {
      ;(req as typeof req & { rawBody?: string }).rawBody = buf.toString('utf8')
    }
  },
}))
app.use(express.urlencoded({ extended: true, limit: process.env.HTTP_BODY_LIMIT || '1mb' }))

// ── Routes ────────────────────────────────────────────────
app.use('/api/v1', router)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ready', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'not_ready' })
  }
})

// ── Error handler (debe ir al final) ──────────────────────
app.use(errorHandler)

export default app
