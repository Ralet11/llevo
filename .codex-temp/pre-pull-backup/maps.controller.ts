import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { autocompletePlaces, computeRoutePreview } from '../services/googleMaps.service'

const autocompleteQuerySchema = z.object({
  input: z.string().trim().min(2),
  latitude: z.coerce.number().finite().optional(),
  longitude: z.coerce.number().finite().optional(),
  sessionToken: z.string().trim().min(8).optional(),
})

const waypointSchema = z.object({
  placeId: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
}).superRefine((value, context) => {
  const hasCoordinates = typeof value.latitude === 'number' && typeof value.longitude === 'number'
  if (!value.placeId && !hasCoordinates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El punto requiere placeId o coordenadas',
    })
  }
})

const routePreviewSchema = z.object({
  origin: waypointSchema,
  destination: waypointSchema,
  travelMode: z.enum(['DRIVE', 'TWO_WHEELER']).optional(),
})

export async function getPlaceAutocomplete(req: Request, res: Response, next: NextFunction) {
  try {
    const query = autocompleteQuerySchema.parse(req.query)
    const suggestions = await autocompletePlaces(query.input, {
      latitude: query.latitude,
      longitude: query.longitude,
      sessionToken: query.sessionToken,
    })

    res.json({ suggestions })
  } catch (error) {
    next(error)
  }
}

export async function postRoutePreview(req: Request, res: Response, next: NextFunction) {
  try {
    const body = routePreviewSchema.parse(req.body)
    const route = await computeRoutePreview(body)

    res.json({ route })
  } catch (error) {
    next(error)
  }
}
