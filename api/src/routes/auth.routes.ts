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
  verifyEmailCode,
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { rateLimit } from '../middleware/rateLimit'

const router = Router()

// 5 intentos por IP / 10 minutos (protege contra flooding costoso)
const smsLimit = rateLimit(5, 10 * 60 * 1000, 'Demasiados intentos. Espera 10 minutos.')
// 10 intentos por IP / 15 minutos en endpoints de login con password
const loginLimit = rateLimit(10, 15 * 60 * 1000, 'Demasiados intentos de acceso. Espera 15 minutos.')
const emailCodeLimit = rateLimit(5, 10 * 60 * 1000, 'Demasiados intentos. Espera 10 minutos.')

router.post('/register', register)
router.post('/login', loginLimit, login)
router.post('/email/start', emailCodeLimit, startEmailAuth)
router.post('/email/verify-code', emailCodeLimit, verifyEmailCode)
router.post('/email/set-password', emailCodeLimit, setEmailPassword)
router.post('/phone/send-code', smsLimit, sendPhoneCode)
router.post('/phone/register', smsLimit, registerWithPhone)
router.post('/phone/login', smsLimit, loginWithPhone)
router.post('/google', loginLimit, loginWithGoogle)
router.post('/apple', loginLimit, loginWithApple)
router.get('/me', authenticate, me)
router.post('/push-token', authenticate, savePushToken)

export default router
