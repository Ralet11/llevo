import { Router } from 'express'
import { placesAutocomplete, routesPreview } from '../controllers/maps.controller'
import { authenticate } from '../middleware/authenticate'
import { rateLimit } from '../middleware/rateLimit'

const router = Router()
const mapsLimit = rateLimit(30, 10 * 60 * 1000, 'Demasiadas consultas de mapas. Espera unos minutos.')

router.get('/places/autocomplete', authenticate, mapsLimit, placesAutocomplete)
router.post('/routes/preview', authenticate, mapsLimit, routesPreview)

export default router
