import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'

const router = Router()

// GET /users/:id — perfil público de un usuario
router.get('/:id', authenticate, async (req, res) => {
  // TODO: implementar getUserProfile
  res.json({ message: 'TODO: getUserProfile', id: req.params.id })
})

export default router
