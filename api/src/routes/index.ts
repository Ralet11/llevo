import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './users.routes'
import tripRoutes from './trips.routes'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ message: 'LLEVO API v1', status: 'online' })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/trips', tripRoutes)

export default router
