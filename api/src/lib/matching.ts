import prisma from './prisma'

type MatchParams = {
  originCity: string
  destinationCity: string
  weightKg: number
  preferredDate?: Date
  senderId?: string
}

export type CandidateDriver = {
  routeId: string
  driverId: string
  rating: number
  pushToken: string | null
}

const CITY_ALIASES: Record<string, string> = {
  'caba': 'buenos aires',
  'ciudad autonoma de buenos aires': 'buenos aires',
  'ciudad de buenos aires': 'buenos aires',
  'capital federal': 'buenos aires',
}

export function normalize(s: string): string {
  const base = s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  return CITY_ALIASES[base] ?? base
}

export async function findCandidateDrivers(params: MatchParams): Promise<CandidateDriver[]> {
  const originNorm = normalize(params.originCity)
  const destNorm = normalize(params.destinationCity)

  // Mismo origen y destino => envio dentro de la ciudad (lo cubren rutas LOCAL).
  const isLocalShipment = originNorm === destNorm

  const routes = await prisma.driverRoute.findMany({
    where: {
      isActive: true,
      maxWeightKg: { gte: params.weightKg },
      // isActive en una ruta LOCAL significa "online" (presencia en tiempo real).
      kind: isLocalShipment ? 'LOCAL' : 'INTERCITY',
      ...(params.senderId ? { driverId: { not: params.senderId } } : {}),
    },
    include: {
      driver: {
        select: { id: true, rating: true, pushToken: true },
      },
    },
  })

  // If preferredDate provided, compute the required day of week in Argentina time
  let requiredDay: string | null = null
  let preferredDateKey: string | null = null
  if (params.preferredDate) {
    requiredDay = new Intl.DateTimeFormat('en', {
      weekday: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(params.preferredDate).toUpperCase()
    // Mismo formato YYYY-MM-DD que usa DriverDayOff.date (ver drivers.controller.ts).
    preferredDateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(params.preferredDate)
  }

  let matched = routes.filter(route => {
    if (isLocalShipment) {
      // Local: la ruta cubre la ciudad si su ciudad coincide. Sin filtro de dia:
      // estar "online" (isActive) ya implica disponibilidad ahora.
      return normalize(route.originCity) === originNorm
    }
    const allCities = [route.originCity, ...route.waypointCities, route.destinationCity].map(normalize)
    const originIdx = allCities.indexOf(originNorm)
    const destIdx = allCities.indexOf(destNorm)
    if (originIdx === -1 || destIdx === -1 || originIdx >= destIdx) return false
    if (requiredDay && !(route.daysOfWeek as string[]).includes(requiredDay)) return false
    return true
  })

  // INTERCITY con fecha: excluir choferes que marcaron ese dia como no disponible.
  // LOCAL no pasa por aca (es presencia en tiempo real via isActive, no fecha).
  if (!isLocalShipment && preferredDateKey && matched.length > 0) {
    const daysOff = await prisma.driverDayOff.findMany({
      where: {
        driverId: { in: matched.map(r => r.driver.id) },
        date: preferredDateKey,
      },
      select: { driverId: true },
    })
    const offDriverIds = new Set(daysOff.map(d => d.driverId))
    matched = matched.filter(route => !offDriverIds.has(route.driver.id))
  }

  matched.sort((a, b) => b.driver.rating - a.driver.rating)

  return matched.map(route => ({
    routeId: route.id,
    driverId: route.driver.id,
    rating: route.driver.rating,
    pushToken: route.driver.pushToken,
  }))
}

// ─────────────────────────────────────────────
// PASAJEROS: buscar viajes que cubren A -> B una fecha dada
// ─────────────────────────────────────────────

type PassengerSearchParams = {
  originCity: string
  destinationCity: string
  date: Date
  passengerId?: string
}

export type PassengerTripOption = {
  routeId: string
  date: string
  originCity: string
  destinationCity: string
  waypointCities: string[]
  departureTimeFrom: string | null
  departureTimeTo: string | null
  pricePerSeat: number | null
  seatsOffered: number
  seatsFree: number
  driver: {
    id: string
    name: string
    avatarUrl: string | null
    rating: number
    ratingCount: number
    isIdentityVerified: boolean
  }
  vehicle: { type: string; model: string | null; seats: number } | null
}

export type PassengerSearchResult = {
  sameCity: boolean
  options: PassengerTripOption[]
}

// Busca rutas INTERCITY que llevan pasajeros y cubren el corredor origen -> destino
// en el dia de la fecha pedida, con asientos libres. Por ahora solo entre ciudades.
export async function findPassengerTrips(params: PassengerSearchParams): Promise<PassengerSearchResult> {
  const originNorm = normalize(params.originCity)
  const destNorm = normalize(params.destinationCity)

  // Dentro de la misma ciudad todavia no se cubre (viajes entre ciudades primero).
  if (originNorm === destNorm) return { sameCity: true, options: [] }

  const requiredDay = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(params.date).toUpperCase()
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(params.date)

  const routes = await prisma.driverRoute.findMany({
    where: {
      isActive: true,
      kind: 'INTERCITY',
      carriesPassengers: true,
      ...(params.passengerId ? { driverId: { not: params.passengerId } } : {}),
    },
    include: {
      driver: {
        select: {
          id: true, name: true, avatarUrl: true, rating: true, ratingCount: true,
          driverVerifiedAt: true, driverVerificationStatus: true,
        },
      },
      vehicle: { select: { type: true, model: true, seats: true } },
    },
  })

  let matched = routes.filter(route => {
    const allCities = [route.originCity, ...route.waypointCities, route.destinationCity].map(normalize)
    const originIdx = allCities.indexOf(originNorm)
    const destIdx = allCities.indexOf(destNorm)
    if (originIdx === -1 || destIdx === -1 || originIdx >= destIdx) return false
    if (!(route.daysOfWeek as string[]).includes(requiredDay)) return false
    return true
  })

  // Excluir choferes que marcaron ese dia como no disponible.
  if (matched.length > 0) {
    const daysOff = await prisma.driverDayOff.findMany({
      where: { driverId: { in: matched.map(r => r.driver.id) }, date: dateKey },
      select: { driverId: true },
    })
    const offDriverIds = new Set(daysOff.map(d => d.driverId))
    matched = matched.filter(route => !offDriverIds.has(route.driver.id))
  }

  // Asientos ya reservados (APPROVED/PAID) por ruta para esa fecha, para descontarlos.
  const heldByRoute = new Map<string, number>()
  if (matched.length > 0) {
    const held = await prisma.rideBooking.groupBy({
      by: ['routeId'],
      where: { routeId: { in: matched.map(r => r.id) }, date: dateKey, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { seats: true },
    })
    for (const h of held) heldByRoute.set(h.routeId, h._sum.seats ?? 0)
  }

  const options: PassengerTripOption[] = matched.map(route => {
    const seatsOffered = route.seatsOffered ?? 0
    const seatsFree = Math.max(0, seatsOffered - (heldByRoute.get(route.id) ?? 0))
    return {
      routeId: route.id,
      date: dateKey,
      originCity: route.originCity,
      destinationCity: route.destinationCity,
      waypointCities: route.waypointCities,
      departureTimeFrom: route.departureTimeFrom,
      departureTimeTo: route.departureTimeTo,
      pricePerSeat: route.pricePerSeat,
      seatsOffered,
      seatsFree,
      driver: {
        id: route.driver.id,
        name: route.driver.name,
        avatarUrl: route.driver.avatarUrl,
        rating: route.driver.rating,
        ratingCount: route.driver.ratingCount,
        isIdentityVerified: route.driver.driverVerifiedAt != null || route.driver.driverVerificationStatus === 'APPROVED',
      },
      vehicle: route.vehicle
        ? { type: route.vehicle.type, model: route.vehicle.model, seats: route.vehicle.seats }
        : null,
    }
  })

  // Ordenar por horario de salida (los sin horario al final), luego por rating.
  options.sort((a, b) => {
    const ta = a.departureTimeFrom ?? '99:99'
    const tb = b.departureTimeFrom ?? '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return b.driver.rating - a.driver.rating
  })

  return { sameCity: false, options: options.filter(o => o.seatsFree > 0) }
}
