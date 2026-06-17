import { Router } from 'express'
import authRoutes from './auth.routes'
import mapsRoutes from './maps.routes'
import userRoutes from './users.routes'
import tripRoutes from './trips.routes'
import driverRoutesRoutes from './driverRoutes.routes'
import driverVerificationRoutes from './driverVerification.routes'
import shipmentsRoutes from './shipments.routes'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ message: 'LLEVO API v1', status: 'online' })
})

router.use('/auth', authRoutes)
router.use('/maps', mapsRoutes)
router.use('/users', userRoutes)
router.use('/trips', tripRoutes)
router.use('/drivers/routes', driverRoutesRoutes)
router.use('/drivers/verification', driverVerificationRoutes)
router.use('/shipments', shipmentsRoutes)

export default router
