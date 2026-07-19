import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getUserProfile } from '../controllers/users.controller'

const router = Router()

// GET /users/:id — perfil público de un usuario
router.get('/:id', authenticate, getUserProfile)

export default router
