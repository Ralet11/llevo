import { Router } from 'express'
import {
  register,
  login,
  me,
  savePushToken,
  sendPhoneCode,
  registerWithPhone,
  loginWithPhone,
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { rateLimit } from '../middleware/rateLimit'

const router = Router()

// 5 intentos por IP / 10 minutos (protege contra SMS flooding costoso en Twilio)
const smsLimit = rateLimit(5, 10 * 60 * 1000, 'Demasiados intentos. Esperá 10 minutos.')
// 10 intentos por IP / 15 minutos en endpoints de login con password
const loginLimit = rateLimit(10, 15 * 60 * 1000, 'Demasiados intentos de acceso. Esperá 15 minutos.')

router.post('/register', register)
router.post('/login', loginLimit, login)
router.post('/phone/send-code', smsLimit, sendPhoneCode)
router.post('/phone/register', smsLimit, registerWithPhone)
router.post('/phone/login', smsLimit, loginWithPhone)
router.get('/me', authenticate, me)
router.post('/push-token', authenticate, savePushToken)

export default router
