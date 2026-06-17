import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
  createDriverRoute,
  getMyRoutes,
  updateDriverRoute,
  deleteDriverRoute,
} from '../controllers/driverRoutes.controller'

const router = Router()

router.get('/mine', authenticate, getMyRoutes)
router.post('/', authenticate, createDriverRoute)
router.patch('/:id', authenticate, updateDriverRoute)
router.delete('/:id', authenticate, deleteDriverRoute)

export default router
