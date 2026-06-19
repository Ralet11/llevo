import { AppError } from '../middleware/errorHandler'

export type Coordinates = {
  latitude: number
  longitude: number
}

export type PlaceSuggestion = {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
  distanceMeters?: number
}

export type PlaceDetails = {
  placeId: string
  label: string
  formattedAddress: string
  location: Coordinates
}

export type RouteWaypointInput = {
  placeId?: string
  label?: string
  latitude?: number
  longitude?: number
}

export type RoutePreviewInput = {
  origin: RouteWaypointInput
  destination: RouteWaypointInput
  travelMode?: 'DRIVE' | 'TWO_WHEELER'
}

export type RoutePreview = {
  origin: PlaceDetails
  destination: PlaceDetails
  distanceMeters: number
  durationSeconds: number
  encodedPolyline: string
  travelMode: 'DRIVE' | 'TWO_WHEELER'
}

type GooglePlaceAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
      }
      distanceMeters?: number
    }
  }>
  error?: {
    message?: string
  }
}

type GooglePlaceDetailsResponse = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: Coordinates
  error?: {
    message?: string
  }
}

type GoogleRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
    polyline?: {
      encodedPolyline?: string
    }
  }>
  error?: {
    message?: string
  }
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const GOOGLE_MAPS_REGION_CODE = (process.env.GOOGLE_MAPS_REGION_CODE || 'AR').toUpperCase()
const GOOGLE_MAPS_LANGUAGE_CODE = process.env.GOOGLE_MAPS_LANGUAGE_CODE || 'es'

function assertGoogleMapsKey() {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new AppError('Falta configurar GOOGLE_MAPS_API_KEY en el backend', 503)
  }
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function googleRequest<T>(url: string, init: RequestInit, defaultErrorMessage: string): Promise<T> {
  assertGoogleMapsKey()

  const response = await fetch(url, init)
  const payload = await parseJsonSafe<{ error?: { message?: string } } & T>(response)

  if (!response.ok) {
    const message = payload?.error?.message || defaultErrorMessage
    throw new AppError(message, response.status >= 500 ? 502 : response.status)
  }

  if (!payload) {
    throw new AppError(defaultErrorMessage, 502)
  }

  return payload
}

function formatCoordinateLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

function parseGoogleDurationSeconds(rawDuration?: string) {
  if (!rawDuration) return 0
  const seconds = Number.parseFloat(rawDuration.replace('s', ''))
  return Number.isFinite(seconds) ? Math.round(seconds) : 0
}

export async function autocompletePlaces(input: string, options?: { latitude?: number; longitude?: number; sessionToken?: string }) {
  const body: Record<string, unknown> = {
    input,
    languageCode: GOOGLE_MAPS_LANGUAGE_CODE,
    regionCode: GOOGLE_MAPS_REGION_CODE,
    includedRegionCodes: [GOOGLE_MAPS_REGION_CODE],
  }

  if (
    typeof options?.latitude === 'number' &&
    Number.isFinite(options.latitude) &&
    typeof options.longitude === 'number' &&
    Number.isFinite(options.longitude)
  ) {
    body.origin = {
      latitude: options.latitude,
      longitude: options.longitude,
    }
    body.locationBias = {
      circle: {
        center: {
          latitude: options.latitude,
          longitude: options.longitude,
        },
        radius: 25000,
      },
    }
  }

  if (options?.sessionToken) {
    body.sessionToken = options.sessionToken
  }

  const payload = await googleRequest<GooglePlaceAutocompleteResponse>(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask': [
          'suggestions.placePrediction.placeId',
          'suggestions.placePrediction.text.text',
          'suggestions.placePrediction.structuredFormat.mainText.text',
          'suggestions.placePrediction.structuredFormat.secondaryText.text',
          'suggestions.placePrediction.distanceMeters',
        ].join(','),
      },
      body: JSON.stringify(body),
    },
    'No se pudo buscar lugares con Google Places'
  )

  return (payload.suggestions ?? [])
    .map(suggestion => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId && prediction?.text?.text))
    .map(prediction => ({
      placeId: prediction.placeId!,
      text: prediction.text?.text ?? '',
      mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
      secondaryText: prediction.structuredFormat?.secondaryText?.text ?? '',
      distanceMeters: prediction.distanceMeters,
    })) satisfies PlaceSuggestion[]
}

export async function getPlaceDetails(placeId: string) {
  const payload = await googleRequest<GooglePlaceDetailsResponse>(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    },
    'No se pudo obtener el detalle del lugar'
  )

  if (!payload.id || !payload.location) {
    throw new AppError('Google Places no devolvio coordenadas para ese lugar', 502)
  }

  return {
    placeId: payload.id,
    label: payload.displayName?.text || payload.formattedAddress || payload.id,
    formattedAddress: payload.formattedAddress || payload.displayName?.text || payload.id,
    location: payload.location,
  } satisfies PlaceDetails
}

async function resolveWaypoint(input: RouteWaypointInput) {
  if (input.placeId) {
    const place = await getPlaceDetails(input.placeId)
    return {
      ...place,
      label: input.label || place.label,
      formattedAddress: place.formattedAddress || input.label || place.label,
    } satisfies PlaceDetails
  }

  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    return {
      placeId: `coords:${input.latitude},${input.longitude}`,
      label: input.label || formatCoordinateLabel(input.latitude, input.longitude),
      formattedAddress: input.label || formatCoordinateLabel(input.latitude, input.longitude),
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
    } satisfies PlaceDetails
  }

  throw new AppError('Cada punto requiere un placeId o coordenadas', 400)
}

export async function computeRoutePreview(input: RoutePreviewInput) {
  const travelMode = input.travelMode ?? 'DRIVE'
  const [origin, destination] = await Promise.all([
    resolveWaypoint(input.origin),
    resolveWaypoint(input.destination),
  ])

  const payload = await googleRequest<GoogleRoutesResponse>(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: origin.location,
          },
        },
        destination: {
          location: {
            latLng: destination.location,
          },
        },
        travelMode,
        routingPreference: 'TRAFFIC_AWARE',
        polylineQuality: 'HIGH_QUALITY',
        polylineEncoding: 'ENCODED_POLYLINE',
        languageCode: GOOGLE_MAPS_LANGUAGE_CODE,
        units: 'METRIC',
      }),
    },
    'No se pudo calcular la ruta con Google Routes'
  )

  const route = payload.routes?.[0]
  if (!route?.distanceMeters || !route.polyline?.encodedPolyline) {
    throw new AppError('Google Routes no devolvio una ruta utilizable', 502)
  }

  return {
    origin,
    destination,
    distanceMeters: route.distanceMeters,
    durationSeconds: parseGoogleDurationSeconds(route.duration),
    encodedPolyline: route.polyline.encodedPolyline,
    travelMode,
  } satisfies RoutePreview
}
