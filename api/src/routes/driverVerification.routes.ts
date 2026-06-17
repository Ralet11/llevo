import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
  getDriverVerificationStatus,
  handleDiditWebhook,
  startDriverVerification,
} from '../controllers/driverVerification.controller'

const router = Router()

router.post('/webhook', handleDiditWebhook)
router.get('/status', authenticate, getDriverVerificationStatus)
router.post('/session', authenticate, startDriverVerification)

export default router
