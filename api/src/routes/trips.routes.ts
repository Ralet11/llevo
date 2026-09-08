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
  completeBooking,
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

// These incomplete legacy/demand flows are deliberately outside the internal MVP.
router.use('/travel-requests', (_req, res) => { res.status(410).json({ error: 'Usá la búsqueda de rutas y sus alertas en esta versión' }) })

// Búsqueda de viajes de pasajeros (matching contra rutas que llevan personas).
router.get('/search', authenticate, searchTrips)

// Reservas de pasajeros (solicitar / aprobar / cancelar).
router.post('/book', authenticate, createBooking)
router.get('/bookings/mine', authenticate, getMyBookings)
router.get('/ride-requests', authenticate, getRideRequests)
router.post('/bookings/:id/respond', authenticate, respondBooking)
router.post('/bookings/:id/cancel', authenticate, cancelBooking)
router.post('/bookings/:id/complete', authenticate, completeBooking)

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
router.get('/', (_req, res) => { res.status(410).json({ error: 'Usá /trips/search' }) })
router.get('/:id', (_req, res) => { res.status(410).json({ error: 'El flujo legacy no está disponible' }) })

// Requieren autenticación
router.post('/', (_req, res) => { res.status(410).json({ error: 'Usá rutas de conductor' }) })
router.post('/:id/passenger-request', (_req, res) => { res.status(410).json({ error: 'Usá reservas de asiento' }) })
router.post('/:id/package-request', (_req, res) => { res.status(410).json({ error: 'Usá envíos' }) })

export default router
