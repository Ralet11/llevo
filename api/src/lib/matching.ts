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

function normalize(s: string): string {
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

  const routes = await prisma.driverRoute.findMany({
    where: {
      isActive: true,
      maxWeightKg: { gte: params.weightKg },
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
  if (params.preferredDate) {
    requiredDay = new Intl.DateTimeFormat('en', {
      weekday: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(params.preferredDate).toUpperCase()
  }

  const matched = routes.filter(route => {
    const allCities = [route.originCity, ...route.waypointCities, route.destinationCity].map(normalize)
    const originIdx = allCities.indexOf(originNorm)
    const destIdx = allCities.indexOf(destNorm)
    if (originIdx === -1 || destIdx === -1 || originIdx >= destIdx) return false
    if (requiredDay && !(route.daysOfWeek as string[]).includes(requiredDay)) return false
    return true
  })

  matched.sort((a, b) => b.driver.rating - a.driver.rating)

  return matched.map(route => ({
    routeId: route.id,
    driverId: route.driver.id,
    rating: route.driver.rating,
    pushToken: route.driver.pushToken,
  }))
}
