import { Router } from 'express'
import {
  createTrip,
  getTrips,
  getTripById,
  requestPassengerSeat,
  requestPackageCarry,
} from '../controllers/trips.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

// Búsqueda de viajes (público)
router.get('/', getTrips)
router.get('/:id', getTripById)

// Requieren autenticación
router.post('/', authenticate, createTrip)
router.post('/:id/passenger-request', authenticate, requestPassengerSeat)
router.post('/:id/package-request', authenticate, requestPackageCarry)

export default router
