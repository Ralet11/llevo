import { Router } from 'express'
import { getPlaceAutocomplete, postRoutePreview } from '../controllers/maps.controller'

const router = Router()

router.get('/places/autocomplete', getPlaceAutocomplete)
router.post('/routes/preview', postRoutePreview)

export default router
