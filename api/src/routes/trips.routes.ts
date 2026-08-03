import { Router } from 'express'
import {
  createTrip,
  getTrips,
  getTripById,
  searchTrips,
  requestPassengerSeat,
  requestPackageCarry,
} from '../controllers/trips.controller'
import {
  createBooking,
  getMyBookings,
  getRideRequests,
  respondBooking,
  cancelBooking,
} from '../controllers/rideBookings.controller'
import { authenticate } from '../middleware/authenticate'
import {
  cancelTravelRequest,
  cancelRouteAlert,
  createTravelRequest,
  createRouteAlert,
  getMyRouteAlerts,
  getMyTravelRequest,
  getMyTravelRequests,
  getDriverTravelOpportunities,
  respondToTravelRequest,
} from '../controllers/travelRequests.controller'

const router = Router()

// Búsqueda de viajes de pasajeros (matching contra rutas que llevan personas).
router.get('/search', authenticate, searchTrips)

// Reservas de pasajeros (solicitar / aprobar / cancelar).
router.post('/book', authenticate, createBooking)
router.get('/bookings/mine', authenticate, getMyBookings)
router.get('/ride-requests', authenticate, getRideRequests)
router.post('/bookings/:id/respond', authenticate, respondBooking)
router.post('/bookings/:id/cancel', authenticate, cancelBooking)

// Intenciones de viaje: demanda persistente antes de que exista una reserva.
router.post('/travel-requests', authenticate, createTravelRequest)
router.post('/route-alerts', authenticate, createRouteAlert)
router.get('/route-alerts/mine', authenticate, getMyRouteAlerts)
router.delete('/route-alerts/:id', authenticate, cancelRouteAlert)
router.get('/travel-requests/mine', authenticate, getMyTravelRequests)
router.get('/travel-requests/opportunities', authenticate, getDriverTravelOpportunities)
router.post('/travel-requests/:id/respond', authenticate, respondToTravelRequest)
router.get('/travel-requests/:id', authenticate, getMyTravelRequest)
router.post('/travel-requests/:id/cancel', authenticate, cancelTravelRequest)

// Búsqueda de viajes legacy (público)
router.get('/', getTrips)
router.get('/:id', getTripById)

// Requieren autenticación
router.post('/', authenticate, createTrip)
router.post('/:id/passenger-request', authenticate, requestPassengerSeat)
router.post('/:id/package-request', authenticate, requestPackageCarry)

export default router
