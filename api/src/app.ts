import express from 'express'
import cors from 'cors'
import router from './routes'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const DIDIT_WEBHOOK_PATH = '/api/v1/drivers/verification/webhook'

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json({
  verify: (req, _res, buf) => {
    const requestPath = req.url?.split('?')[0]
    if (requestPath === DIDIT_WEBHOOK_PATH) {
      ;(req as typeof req & { rawBody?: string }).rawBody = buf.toString('utf8')
    }
  },
}))
app.use(express.urlencoded({ extended: true }))

// ── Routes ────────────────────────────────────────────────
app.use('/api/v1', router)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Error handler (debe ir al final) ──────────────────────
app.use(errorHandler)

export default app
