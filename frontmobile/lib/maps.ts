import { BASE_URL } from './api'

export type PlaceSuggestion = {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
  distanceMeters?: number
}

export type RouteWaypointPayload = {
  placeId?: string
  label?: string
  latitude?: number
  longitude?: number
}

export type RoutePreview = {
  origin: {
    placeId: string
    label: string
    formattedAddress: string
    location: {
      latitude: number
      longitude: number
    }
  }
  destination: {
    placeId: string
    label: string
    formattedAddress: string
    location: {
      latitude: number
      longitude: number
    }
  }
  distanceMeters: number
  durationSeconds: number
  encodedPolyline: string
  travelMode: 'DRIVE' | 'TWO_WHEELER'
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    searchParams.append(key, String(value))
  })

  return searchParams.toString()
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMessage =
      typeof payload?.error === 'string'
        ? payload.error
        : 'No se pudo completar la solicitud al backend'

    throw new Error(errorMessage)
  }

  return payload as T
}

export async function autocompletePlaces(params: {
  input: string
  latitude?: number
  longitude?: number
  sessionToken?: string
}) {
  const query = buildQuery({
    input: params.input,
    latitude: params.latitude,
    longitude: params.longitude,
    sessionToken: params.sessionToken,
  })

  const response = await fetch(`${BASE_URL}/maps/places/autocomplete?${query}`)
  const payload = await parseResponse<{ suggestions: PlaceSuggestion[] }>(response)
  return payload.suggestions
}

export async function computeRoutePreview(payload: {
  origin: RouteWaypointPayload
  destination: RouteWaypointPayload
  travelMode?: 'DRIVE' | 'TWO_WHEELER'
}) {
  const response = await fetch(`${BASE_URL}/maps/routes/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await parseResponse<{ route: RoutePreview }>(response)
  return data.route
}

export function decodePolyline(encoded: string) {
  const coordinates: Array<{ latitude: number; longitude: number }> = []
  let index = 0
  let latitude = 0
  let longitude = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const latitudeDelta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    latitude += latitudeDelta

    result = 0
    shift = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const longitudeDelta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    longitude += longitudeDelta

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    })
  }

  return coordinates
}
