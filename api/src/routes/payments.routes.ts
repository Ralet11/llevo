import { Router } from 'express'
import { createRideCheckout, createShipmentCheckout, mercadoPagoWebhook } from '../controllers/payments.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.post('/ride-bookings/:id/checkout', authenticate, createRideCheckout)
router.post('/shipment-jobs/:id/checkout', authenticate, createShipmentCheckout)
router.post('/mercadopago/webhook', mercadoPagoWebhook)
export default router
