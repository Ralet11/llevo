import { AppError } from '../middleware/errorHandler'

export type AutocompleteSuggestion = {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
  distanceMeters?: number
}

export type RouteWaypointInput = {
  placeId?: string
  label?: string
  latitude?: number
  longitude?: number
}

export type RouteStep = {
  instruction: string
  maneuver: string
  distanceMeters: number
  encodedPolyline: string
  startLocation: { latitude: number; longitude: number }
  endLocation: { latitude: number; longitude: number }
}

export type RoutePreview = {
  origin: {
    placeId: string
    label: string
    formattedAddress: string
    city: string | null
    location: {
      latitude: number
      longitude: number
    }
  }
  destination: {
    placeId: string
    label: string
    formattedAddress: string
    city: string | null
    location: {
      latitude: number
      longitude: number
    }
  }
  distanceMeters: number
  durationSeconds: number
  encodedPolyline: string
  steps: RouteStep[]
  travelMode: 'DRIVE' | 'TWO_WHEELER'
}

type PlacesAutocompleteResponse = {
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
}

type PlaceDetailsResponse = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  addressComponents?: Array<{
    longText?: string
    types?: string[]
  }>
}

type GoogleLatLng = { latLng?: { latitude?: number; longitude?: number } }

type GoogleRouteStep = {
  distanceMeters?: number
  navigationInstruction?: {
    maneuver?: string
    instructions?: string
  }
  polyline?: { encodedPolyline?: string }
  startLocation?: GoogleLatLng
  endLocation?: GoogleLatLng
}

type ComputeRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
    polyline?: {
      encodedPolyline?: string
    }
    legs?: Array<{
      steps?: GoogleRouteStep[]
    }>
  }>
}

type ResolvedWaypoint = {
  placeId: string
  label: string
  formattedAddress: string
  city: string | null
  location: {
    latitude: number
    longitude: number
  }
}

const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const PLACES_DETAILS_URL = 'https://places.googleapis.com/v1/places'
const ROUTES_COMPUTE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new AppError('Falta configurar GOOGLE_MAPS_API_KEY en el backend', 500)
  return apiKey
}

function getLanguageCode() {
  return process.env.GOOGLE_MAPS_LANGUAGE_CODE || 'es'
}

function getRegionCode() {
  return process.env.GOOGLE_MAPS_REGION_CODE || 'AR'
}

function buildGoogleErrorMessage(payload: unknown, fallbackMessage: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object' &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message
  }

  return fallbackMessage
}

async function googleRequest<T>(
  url: string,
  init: RequestInit,
  options?: {
    fieldMask?: string
    fallbackErrorMessage?: string
  }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getGoogleMapsApiKey(),
  }

  if (options?.fieldMask) headers['X-Goog-FieldMask'] = options.fieldMask
  if (init.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>)
  }

  let response: Response
  try {
    response = await fetch(url, { ...init, headers })
  } catch {
    throw new AppError('No pude comunicarme con Google Maps desde el backend', 502)
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new AppError(
      buildGoogleErrorMessage(payload, options?.fallbackErrorMessage || 'Google Maps devolvio un error'),
      response.status >= 400 && response.status < 500 ? 502 : 500
    )
  }

  return payload as T
}

function extractCityFromComponents(
  components?: Array<{ longText?: string; types?: string[] }>
): string | null {
  if (!components) return null
  const locality = components.find(c => c.types?.includes('locality'))
  if (locality?.longText) return locality.longText
  const area2 = components.find(c => c.types?.includes('administrative_area_level_2'))
  if (area2?.longText) return area2.longText
  const area1 = components.find(c => c.types?.includes('administrative_area_level_1'))
  return area1?.longText ?? null
}

function parseDurationSeconds(duration?: string) {
  if (!duration) return 0
  const seconds = Number.parseFloat(duration.replace(/s$/, ''))
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
}

function flattenGoogleLatLng(point?: GoogleLatLng): { latitude: number; longitude: number } | null {
  const latitude = point?.latLng?.latitude
  const longitude = point?.latLng?.longitude
  if (latitude === undefined || longitude === undefined) return null
  return { latitude, longitude }
}

function parseRouteSteps(steps?: GoogleRouteStep[]): RouteStep[] {
  if (!steps) return []
  return steps
    .map((step): RouteStep | null => {
      const startLocation = flattenGoogleLatLng(step.startLocation)
      const endLocation = flattenGoogleLatLng(step.endLocation)
      if (!startLocation || !endLocation || !step.polyline?.encodedPolyline) return null

      return {
        instruction: step.navigationInstruction?.instructions || '',
        maneuver: step.navigationInstruction?.maneuver || 'STRAIGHT',
        distanceMeters: step.distanceMeters || 0,
        encodedPolyline: step.polyline.encodedPolyline,
        startLocation,
        endLocation,
      }
    })
    .filter((step): step is RouteStep => step !== null)
}

async function getPlaceDetails(placeId: string, sessionToken?: string) {
  const query = new URLSearchParams({
    languageCode: getLanguageCode(),
    regionCode: getRegionCode(),
  })

  if (sessionToken) query.set('sessionToken', sessionToken)

  const payload = await googleRequest<PlaceDetailsResponse>(
    `${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}?${query.toString()}`,
    { method: 'GET' },
    {
      fieldMask: 'id,displayName,formattedAddress,location,addressComponents',
      fallbackErrorMessage: 'No pude obtener los datos del lugar seleccionado',
    }
  )

  const latitude = payload.location?.latitude
  const longitude = payload.location?.longitude

  if (!payload.id || latitude === undefined || longitude === undefined) {
    throw new AppError('Google Maps devolvio un lugar incompleto', 502)
  }

  return {
    placeId: payload.id,
    label: payload.displayName?.text || payload.formattedAddress || payload.id,
    formattedAddress: payload.formattedAddress || payload.displayName?.text || payload.id,
    city: extractCityFromComponents(payload.addressComponents),
    location: {
      latitude,
      longitude,
    },
  } satisfies ResolvedWaypoint
}

async function reverseGeocode(latitude: number, longitude: number): Promise<{ city: string | null; formattedAddress: string | null }> {
  try {
    const url = `${GEOCODING_URL}?latlng=${latitude},${longitude}&key=${getGoogleMapsApiKey()}&language=${getLanguageCode()}&region=${getRegionCode()}`
    const response = await fetch(url)
    const data = await response.json() as {
      status: string
      results?: Array<{
        formatted_address?: string
        address_components?: Array<{ long_name?: string; types?: string[] }>
      }>
    }
    if (data.status !== 'OK' || !data.results?.[0]) return { city: null, formattedAddress: null }
    const result = data.results[0]
    const city = extractCityFromComponents(
      result.address_components?.map(c => ({ longText: c.long_name, types: c.types }))
    )
    return { city, formattedAddress: result.formatted_address ?? null }
  } catch {
    return { city: null, formattedAddress: null }
  }
}

async function forwardGeocode(address: string): Promise<ResolvedWaypoint> {
  const url = `${GEOCODING_URL}?address=${encodeURIComponent(address)}&key=${getGoogleMapsApiKey()}&language=${getLanguageCode()}&region=${getRegionCode()}`
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new AppError('No pude comunicarme con Google Maps desde el backend', 502)
  }

  const data = await response.json().catch(() => null) as {
    status: string
    results?: Array<{
      place_id?: string
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
      address_components?: Array<{ long_name?: string; types?: string[] }>
    }>
  } | null

  if (!data || data.status !== 'OK' || !data.results?.[0]) {
    throw new AppError(`No pude ubicar la dirección "${address}"`, 404)
  }

  const result = data.results[0]
  const lat = result.geometry?.location?.lat
  const lng = result.geometry?.location?.lng

  if (!result.place_id || lat === undefined || lng === undefined) {
    throw new AppError('Google Maps devolvió un lugar incompleto', 502)
  }

  return {
    placeId: result.place_id,
    label: result.formatted_address || address,
    formattedAddress: result.formatted_address || address,
    city: extractCityFromComponents(
      result.address_components?.map(c => ({ longText: c.long_name, types: c.types }))
    ),
    location: { latitude: lat, longitude: lng },
  }
}

async function resolveWaypointFromText(input: string) {
  return forwardGeocode(input)
}

async function resolveWaypoint(input: RouteWaypointInput, sessionToken?: string) {
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    const geocoded = await reverseGeocode(input.latitude, input.longitude)
    return {
      details: {
        placeId: input.placeId || `coords:${input.latitude},${input.longitude}`,
        label: geocoded.formattedAddress || input.label || 'Punto en el mapa',
        formattedAddress: geocoded.formattedAddress || input.label || 'Punto en el mapa',
        city: geocoded.city,
        location: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
      } satisfies ResolvedWaypoint,
      waypoint: {
        location: {
          latLng: {
            latitude: input.latitude,
            longitude: input.longitude,
          },
        },
      },
    }
  }

  if (input.placeId) {
    const details = await getPlaceDetails(input.placeId, sessionToken)
    return {
      details,
      waypoint: {
        placeId: input.placeId,
      },
    }
  }

  if (input.label?.trim()) {
    const details = await resolveWaypointFromText(input.label.trim())
    return {
      details,
      // Usar latLng en lugar de placeId: más confiable en la Routes API para
      // direcciones ya geocodificadas (evita ambigüedad de placeId viejo/inválido).
      waypoint: {
        location: {
          latLng: {
            latitude: details.location.latitude,
            longitude: details.location.longitude,
          },
        },
      },
    }
  }

  throw new AppError('Faltan datos para calcular la ruta', 400)
}

export async function autocompletePlaces(params: {
  input: string
  latitude?: number
  longitude?: number
  sessionToken?: string
  citiesOnly?: boolean
}) {
  const body: Record<string, unknown> = {
    input: params.input,
    languageCode: getLanguageCode(),
    regionCode: getRegionCode(),
    includedRegionCodes: [getRegionCode()],
  }

  if (params.citiesOnly) {
    body.includedPrimaryTypes = ['locality']
  }

  if (params.sessionToken) body.sessionToken = params.sessionToken

  if (typeof params.latitude === 'number' && typeof params.longitude === 'number') {
    body.origin = {
      latitude: params.latitude,
      longitude: params.longitude,
    }
    body.locationBias = {
      circle: {
        center: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        radius: 50000,
      },
    }
  }

  const payload = await googleRequest<PlacesAutocompleteResponse>(
    PLACES_AUTOCOMPLETE_URL,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    {
      fieldMask:
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text,suggestions.placePrediction.distanceMeters',
      fallbackErrorMessage: 'No pude obtener sugerencias de Google Maps',
    }
  )

  return (payload.suggestions || [])
    .map(suggestion => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId && prediction?.text?.text))
    .map(prediction => ({
      placeId: prediction.placeId!,
      text: prediction.text!.text!,
      mainText: prediction.structuredFormat?.mainText?.text || prediction.text!.text!,
      secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
      distanceMeters: prediction.distanceMeters,
    })) satisfies AutocompleteSuggestion[]
}

export async function computeRoutePreview(params: {
  origin: RouteWaypointInput
  destination: RouteWaypointInput
  travelMode?: 'DRIVE' | 'TWO_WHEELER'
  sessionToken?: string
}) {
  const travelMode = params.travelMode || 'DRIVE'
  const [origin, destination] = await Promise.all([
    resolveWaypoint(params.origin, params.sessionToken),
    resolveWaypoint(params.destination, params.sessionToken),
  ])

  const payload = await googleRequest<ComputeRoutesResponse>(
    ROUTES_COMPUTE_URL,
    {
      method: 'POST',
      body: JSON.stringify({
        origin: origin.waypoint,
        destination: destination.waypoint,
        travelMode,
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        polylineQuality: 'HIGH_QUALITY',
        polylineEncoding: 'ENCODED_POLYLINE',
        languageCode: getLanguageCode(),
        regionCode: getRegionCode(),
      }),
    },
    {
      fieldMask:
        'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,' +
        'routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,' +
        'routes.legs.steps.staticDuration,routes.legs.steps.polyline.encodedPolyline,' +
        'routes.legs.steps.startLocation,routes.legs.steps.endLocation',
      fallbackErrorMessage: 'No pude calcular la ruta en Google Maps',
    }
  )

  const route = payload.routes?.[0]
  if (!route?.polyline?.encodedPolyline) {
    throw new AppError('Google Maps no devolvio una ruta utilizable', 502)
  }

  return {
    origin: {
      placeId: origin.details.placeId,
      label: origin.details.label,
      formattedAddress: origin.details.formattedAddress,
      city: origin.details.city,
      location: origin.details.location,
    },
    destination: {
      placeId: destination.details.placeId,
      label: destination.details.label,
      formattedAddress: destination.details.formattedAddress,
      city: destination.details.city,
      location: destination.details.location,
    },
    distanceMeters: route.distanceMeters || 0,
    durationSeconds: parseDurationSeconds(route.duration),
    encodedPolyline: route.polyline.encodedPolyline,
    steps: parseRouteSteps(route.legs?.[0]?.steps),
    travelMode,
  } satisfies RoutePreview
}
