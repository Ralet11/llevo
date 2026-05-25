import { Router } from 'express'
import { placesAutocomplete, routesPreview } from '../controllers/maps.controller'

const router = Router()

router.get('/places/autocomplete', placesAutocomplete)
router.post('/routes/preview', routesPreview)

export default router
