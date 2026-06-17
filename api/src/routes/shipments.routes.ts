import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
  createShipment,
  getShipmentById,
  getMyShipments,
  getPendingForDriver,
  getActiveJobForDriver,
  getUpcomingForDriver,
  markPickedUp,
  markDelivered,
  respondToShipment,
} from '../controllers/shipments.controller'

const router = Router()

router.get('/mine', authenticate, getMyShipments)
router.get('/pending-for-driver', authenticate, getPendingForDriver)
router.get('/upcoming-for-driver', authenticate, getUpcomingForDriver)
router.get('/active-job', authenticate, getActiveJobForDriver)
router.post('/active-job/pickup', authenticate, markPickedUp)
router.post('/active-job/deliver', authenticate, markDelivered)
router.post('/', authenticate, createShipment)
router.get('/:id', authenticate, getShipmentById)
router.post('/:id/respond', authenticate, respondToShipment)

export default router
