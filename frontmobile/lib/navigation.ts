import { Ionicons } from '@expo/vector-icons'
import type { LatLng } from 'react-native-maps'
import type { RouteStep } from './maps'

type IconName = keyof typeof Ionicons.glyphMap

const EARTH_RADIUS_M = 6371000
const STEP_BOUNDARY_EPSILON_M = 6

const MIN_SPEED_FOR_GPS_HEADING = 1.2 // m/s (~4.3 km/h)
const MIN_DISPLACEMENT_FOR_BEARING_M = 8

const OFF_ROUTE_THRESHOLD_M = 45
const OFF_ROUTE_SUSTAIN_MS = 7000
const REROUTE_COOLDOWN_MS = 25000
const REROUTE_MIN_DISTANCE_MOVED_M = 25
const MAX_REROUTES_PER_LEG = 8

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI
}

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, h)))
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const dLng = toRad(b.longitude - a.longitude)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export type CumulativePoint = { point: LatLng; cumFromStart: number }

// Distancia acumulada desde el inicio de la ruta en cada vertice de la polyline.
// Se calcula una sola vez cuando carga la ruta.
export function buildCumulativePolyline(routeCoords: LatLng[]): CumulativePoint[] {
  const result: CumulativePoint[] = []
  let cum = 0
  for (let i = 0; i < routeCoords.length; i++) {
    if (i > 0) cum += haversineDistanceMeters(routeCoords[i - 1], routeCoords[i])
    result.push({ point: routeCoords[i], cumFromStart: cum })
  }
  return result
}

// Offset acumulado (distancia desde el inicio de la ruta) donde termina cada step.
// Coincide con la polyline completa porque los steps la particionan.
export function buildStepBoundaries(steps: RouteStep[]): number[] {
  const boundaries: number[] = []
  let cum = 0
  for (const step of steps) {
    cum += step.distanceMeters
    boundaries.push(cum)
  }
  return boundaries
}

function projectPointOnSegment(p: LatLng, a: LatLng, b: LatLng): { point: LatLng; t: number; distanceMeters: number } {
  // Proyeccion equirectangular local (aproximacion valida a escala de ciudad/segmento corto).
  const cosLat = Math.cos(toRad(a.latitude))

  const ax = a.longitude * cosLat
  const ay = a.latitude
  const bx = b.longitude * cosLat
  const by = b.latitude
  const px = p.longitude * cosLat
  const py = p.latitude

  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy

  let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))

  const projected: LatLng = {
    latitude: ay + t * dy,
    longitude: (ax + t * dx) / cosLat,
  }

  return { point: projected, t, distanceMeters: haversineDistanceMeters(p, projected) }
}

// Proyecta la posicion actual sobre el segmento mas cercano de la polyline completa.
// Es el primitivo del que se derivan tanto el avance de instrucciones como el desvio.
export function projectPositionOntoPolyline(
  position: LatLng,
  cumulativePolyline: CumulativePoint[]
): { distanceAlongRouteMeters: number; offRouteDistanceMeters: number } {
  if (cumulativePolyline.length === 0) {
    return { distanceAlongRouteMeters: 0, offRouteDistanceMeters: 0 }
  }
  if (cumulativePolyline.length === 1) {
    return { distanceAlongRouteMeters: 0, offRouteDistanceMeters: haversineDistanceMeters(position, cumulativePolyline[0].point) }
  }

  let best = { distanceAlongRouteMeters: 0, offRouteDistanceMeters: Infinity }

  for (let i = 0; i < cumulativePolyline.length - 1; i++) {
    const a = cumulativePolyline[i]
    const b = cumulativePolyline[i + 1]
    const projection = projectPointOnSegment(position, a.point, b.point)

    if (projection.distanceMeters < best.offRouteDistanceMeters) {
      const segmentLength = b.cumFromStart - a.cumFromStart
      best = {
        distanceAlongRouteMeters: a.cumFromStart + projection.t * segmentLength,
        offRouteDistanceMeters: projection.distanceMeters,
      }
    }
  }

  return best
}

export type NavProgress = {
  currentStepIndex: number
  distanceToNextManeuverMeters: number
  distanceRemainingMeters: number
  offRouteDistanceMeters: number
}

// El unico calculo que corre en cada fix de GPS mientras se navega.
export function computeNavProgress(params: {
  position: LatLng
  cumulativePolyline: CumulativePoint[]
  stepBoundaries: number[]
  currentStepIndex: number
}): NavProgress {
  const { position, cumulativePolyline, stepBoundaries, currentStepIndex } = params
  const { distanceAlongRouteMeters, offRouteDistanceMeters } = projectPositionOntoPolyline(position, cumulativePolyline)

  const totalDistance = cumulativePolyline.length > 0
    ? cumulativePolyline[cumulativePolyline.length - 1].cumFromStart
    : 0

  let computedIndex = stepBoundaries.findIndex(boundary => distanceAlongRouteMeters <= boundary + STEP_BOUNDARY_EPSILON_M)
  if (computedIndex === -1) computedIndex = Math.max(0, stepBoundaries.length - 1)

  // Clamp solo hacia adelante: si el conductor retrocede de verdad, la deteccion
  // de desvio se encarga y un recalculo resetea el step index a 0.
  const clampedIndex = Math.min(Math.max(currentStepIndex, computedIndex), Math.max(0, stepBoundaries.length - 1))

  const nextBoundary = stepBoundaries[clampedIndex] ?? totalDistance
  const distanceToNextManeuverMeters = Math.max(0, nextBoundary - distanceAlongRouteMeters)
  const distanceRemainingMeters = Math.max(0, totalDistance - distanceAlongRouteMeters)

  return {
    currentStepIndex: clampedIndex,
    distanceToNextManeuverMeters,
    distanceRemainingMeters,
    offRouteDistanceMeters,
  }
}

export type GpsFix = { latitude: number; longitude: number; heading: number | null; speed: number | null }

// 3 niveles: heading GPS si es confiable, sino bearing entre fixes si hubo
// desplazamiento real, sino mantener el ultimo heading conocido (sin rotar).
export function resolveHeading(params: {
  gpsHeading: number | null
  gpsSpeed: number | null
  prevFix: LatLng | null
  currFix: LatLng
  lastHeading: number | null
}): number | null {
  const { gpsHeading, gpsSpeed, prevFix, currFix, lastHeading } = params

  if (gpsHeading !== null && gpsHeading >= 0 && gpsSpeed !== null && gpsSpeed > MIN_SPEED_FOR_GPS_HEADING) {
    return gpsHeading
  }

  if (prevFix) {
    const displacement = haversineDistanceMeters(prevFix, currFix)
    if (displacement >= MIN_DISPLACEMENT_FOR_BEARING_M) {
      return bearingDegrees(prevFix, currFix)
    }
  }

  return lastHeading
}

// Actualiza (en cada tick) desde cuando estamos desviados, para que shouldTriggerReroute
// pueda exigir que el desvio este sostenido y no dispare por un solo salto de GPS.
export function updateOffRouteSince(offRouteDistanceMeters: number, now: number, currentOffRouteSinceMs: number | null): number | null {
  if (offRouteDistanceMeters < OFF_ROUTE_THRESHOLD_M) return null
  return currentOffRouteSinceMs ?? now
}

export type RerouteState = {
  offRouteSinceMs: number | null
  lastRerouteAt: number | null
  lastRerouteOriginPos: LatLng | null
  rerouteCount: number
}

export function shouldTriggerReroute(params: {
  offRouteDistanceMeters: number
  now: number
  currentPos: LatLng
  state: RerouteState
}): boolean {
  const { offRouteDistanceMeters, now, currentPos, state } = params

  if (offRouteDistanceMeters < OFF_ROUTE_THRESHOLD_M) return false
  if (state.rerouteCount >= MAX_REROUTES_PER_LEG) return false
  if (state.offRouteSinceMs === null || now - state.offRouteSinceMs < OFF_ROUTE_SUSTAIN_MS) return false
  if (state.lastRerouteAt !== null && now - state.lastRerouteAt < REROUTE_COOLDOWN_MS) return false

  if (state.lastRerouteOriginPos) {
    const movedSinceLastReroute = haversineDistanceMeters(state.lastRerouteOriginPos, currentPos)
    if (movedSinceLastReroute < REROUTE_MIN_DISTANCE_MOVED_M) return false
  }

  return true
}

const MANEUVER_ICONS: Record<string, IconName> = {
  DEPART: 'navigate',
  STRAIGHT: 'arrow-up',
  NAME_CHANGE: 'arrow-up',
  TURN_SLIGHT_LEFT: 'arrow-back',
  TURN_LEFT: 'arrow-back',
  TURN_SHARP_LEFT: 'arrow-back',
  UTURN_LEFT: 'return-up-back',
  TURN_SLIGHT_RIGHT: 'arrow-forward',
  TURN_RIGHT: 'arrow-forward',
  TURN_SHARP_RIGHT: 'arrow-forward',
  UTURN_RIGHT: 'return-up-forward',
  RAMP_LEFT: 'git-branch-outline',
  RAMP_RIGHT: 'git-branch-outline',
  FORK_LEFT: 'git-branch-outline',
  FORK_RIGHT: 'git-branch-outline',
  MERGE: 'git-merge-outline',
  ROUNDABOUT_LEFT: 'sync',
  ROUNDABOUT_RIGHT: 'sync',
  FERRY: 'boat-outline',
  FERRY_TRAIN: 'train-outline',
}

const DEFAULT_MANEUVER_ICON: IconName = 'navigate-circle-outline'

export function getManeuverIcon(maneuver: string): IconName {
  return MANEUVER_ICONS[maneuver] ?? DEFAULT_MANEUVER_ICON
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`
  const km = meters / 1000
  return `${km.toLocaleString('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: km < 10 ? 1 : 0 })} km`
}

export function formatEtaMinutes(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes === 0 ? `${hours} h` : `${hours} h ${remainingMinutes} min`
}
