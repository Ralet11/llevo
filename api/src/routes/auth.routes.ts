import { Router } from 'express'
import {
  login,
  loginWithApple,
  loginWithGoogle,
  loginWithPhone,
  me,
  register,
  registerWithPhone,
  savePushToken,
  sendPhoneCode,
  setEmailPassword,
  startEmailAuth,
  updateMe,
  verifyEmailCode,
  verifyMyPhone,
} from '../controllers/auth.controller'
import { getInternalBotPreferences, updateInternalBotPreferences } from '../controllers/internalBots.controller'
import { authenticate } from '../middleware/authenticate'
import { rateLimit } from '../middleware/rateLimit'

const router = Router()

router.use((req, res, next) => {
  if (process.env.INTERNAL_TESTING !== 'true') return next()
  if (req.path === '/register' || req.path === '/phone/register') {
    res.status(403).json({ error: 'En pruebas internas, creá tu cuenta desde Ingresar con email y verificá el código recibido.' })
    return
  }
  if (req.path.startsWith('/email/') && typeof req.body.email === 'string') {
    const emails = (process.env.INTERNAL_TESTER_EMAILS || '').split(',').map(s => s.trim().toLowerCase())
    if (!emails.includes(req.body.email.trim().toLowerCase())) {
      res.status(403).json({ error: 'Esta cuenta no está autorizada para las pruebas internas' })
      return
    }
  }
  next()
})

// 5 intentos por IP / 10 minutos (protege contra flooding costoso)
const smsLimit = rateLimit(5, 10 * 60 * 1000, 'Demasiados intentos. Espera 10 minutos.')
// 10 intentos por IP / 15 minutos en endpoints de login con password
const loginLimit = rateLimit(10, 15 * 60 * 1000, 'Demasiados intentos de acceso. Espera 15 minutos.')
const emailCodeLimit = rateLimit(5, 10 * 60 * 1000, 'Demasiados intentos. Espera 10 minutos.')

router.post('/register', loginLimit, register)
router.post('/login', loginLimit, login)
router.post('/email/start', emailCodeLimit, startEmailAuth)
router.post('/email/verify-code', emailCodeLimit, verifyEmailCode)
router.post('/email/set-password', emailCodeLimit, setEmailPassword)
router.post('/phone/send-code', smsLimit, sendPhoneCode)
router.post('/phone/register', smsLimit, registerWithPhone)
router.post('/phone/login', smsLimit, loginWithPhone)
router.post('/phone/verify', smsLimit, authenticate, verifyMyPhone)
router.post('/google', loginLimit, loginWithGoogle)
router.post('/apple', loginLimit, loginWithApple)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateMe)
router.post('/push-token', authenticate, savePushToken)
router.get('/internal-bots', authenticate, getInternalBotPreferences)
router.put('/internal-bots', authenticate, updateInternalBotPreferences)

export default router
