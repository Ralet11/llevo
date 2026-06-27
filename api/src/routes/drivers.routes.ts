import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDriverStats } from '../controllers/drivers.controller'

const router = Router()

router.get('/stats', authenticate, getDriverStats)

export default router
