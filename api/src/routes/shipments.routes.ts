import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
  createShipment,
  getShipmentById,
  getMyShipments,
  getPendingForDriver,
  getActiveJobForDriver,
  getJobById,
  getUpcomingForDriver,
  getAgendaForDriver,
  cancelActiveJob,
  cancelShipment,
  markPickedUp,
  markDelivered,
  respondToShipment,
} from '../controllers/shipments.controller'

const router = Router()

router.get('/mine', authenticate, getMyShipments)
router.get('/pending-for-driver', authenticate, getPendingForDriver)
router.get('/upcoming-for-driver', authenticate, getUpcomingForDriver)
router.get('/agenda-for-driver', authenticate, getAgendaForDriver)
router.get('/active-job', authenticate, getActiveJobForDriver)
router.get('/jobs/:id', authenticate, getJobById)
router.post('/active-job/cancel', authenticate, cancelActiveJob)
router.post('/active-job/pickup', authenticate, markPickedUp)
router.post('/active-job/deliver', authenticate, markDelivered)
router.post('/', authenticate, createShipment)
router.get('/:id', authenticate, getShipmentById)
router.post('/:id/cancel', authenticate, cancelShipment)
router.post('/:id/respond', authenticate, respondToShipment)

export default router
