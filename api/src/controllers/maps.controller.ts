import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { autocompletePlaces, computeRoutePreview } from '../services/googleMaps'

const autocompleteQuerySchema = z.object({
  input: z.string().trim().min(2),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  sessionToken: z.string().trim().optional(),
})

const waypointSchema = z.object({
  placeId: z.string().trim().optional(),
  label: z.string().trim().optional(),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
})

const routePreviewSchema = z.object({
  origin: waypointSchema,
  destination: waypointSchema,
  travelMode: z.enum(['DRIVE', 'TWO_WHEELER']).optional(),
  sessionToken: z.string().trim().optional(),
})

export async function placesAutocomplete(req: Request, res: Response, next: NextFunction) {
  try {
    const query = autocompleteQuerySchema.parse(req.query)
    const suggestions = await autocompletePlaces(query)
    res.json({ suggestions })
  } catch (error) {
    next(error)
  }
}

export async function routesPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const body = routePreviewSchema.parse(req.body)
    const route = await computeRoutePreview(body)
    res.json({ route })
  } catch (error) {
    next(error)
  }
}
