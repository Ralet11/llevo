import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDriverStats, getMyDaysOff, addDayOff, removeDayOff } from '../controllers/drivers.controller'
import { getMyVehicles, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicles.controller'
import { getMyDriverProfile, resetMyDriverOnboarding, saveMyDriverProfile } from '../controllers/driverProfile.controller'

const router = Router()

router.get('/profile', authenticate, getMyDriverProfile)
router.put('/profile', authenticate, saveMyDriverProfile)
router.post('/profile/reset-onboarding', authenticate, resetMyDriverOnboarding)

router.get('/stats', authenticate, getDriverStats)
router.get('/days-off', authenticate, getMyDaysOff)
router.post('/days-off', authenticate, addDayOff)
router.delete('/days-off/:date', authenticate, removeDayOff)

router.get('/vehicles', authenticate, getMyVehicles)
router.post('/vehicles', authenticate, createVehicle)
router.patch('/vehicles/:id', authenticate, updateVehicle)
router.delete('/vehicles/:id', authenticate, deleteVehicle)

export default router
