import prisma from '../lib/prisma'
import { findPassengerTrips } from '../lib/matching'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from './notifications'

type MatchTravelRequestInput = {
  id: string
  passengerId: string
  originCity: string
  destinationCity: string
  date: string
  seats: number
}

/**
 * Persiste todos los candidatos antes de emitir eventos. Reejecutar esta función
 * es seguro: la restricción única request+ruta evita notificaciones duplicadas.
 */
export async function matchTravelRequest(request: MatchTravelRequestInput): Promise<number> {
  const date = new Date(`${request.date}T12:00:00.000Z`)
  const result = await findPassengerTrips({
    originCity: request.originCity,
    destinationCity: request.destinationCity,
    date,
    passengerId: request.passengerId,
  })
  if (result.sameCity || result.options.length === 0) return 0

  const driverIds = [...new Set(result.options.map(option => option.driver.id))]
  const drivers = await prisma.user.findMany({
    where: { id: { in: driverIds } },
    select: { id: true, pushToken: true },
  })
  const pushTokens = new Map(drivers.map(driver => [driver.id, driver.pushToken]))

  const candidates = await Promise.all(result.options.map(async option => {
    const created = await prisma.travelRequestCandidate.createMany({
      data: [{
        travelRequestId: request.id,
        routeId: option.routeId,
        driverId: option.driver.id,
      }],
      skipDuplicates: true,
    })
    return created.count === 1 ? option : null
  }))

  const newlyNotified = candidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
  if (newlyNotified.length > 0) {
    await prisma.travelRequestEvent.create({
      data: {
        travelRequestId: request.id,
        type: 'CANDIDATES_NOTIFIED',
        metadata: { count: newlyNotified.length, routeIds: newlyNotified.map(candidate => candidate.routeId) },
      },
    })
  }
  await Promise.all(newlyNotified.map(async option => {
    emitToUser(option.driver.id, 'travel-request:new_opportunity', {
      travelRequestId: request.id,
      routeId: option.routeId,
    })
    const pushToken = pushTokens.get(option.driver.id)
    if (pushToken) {
      await sendPushNotification({
        to: pushToken,
        title: 'Nuevo pasajero en tu ruta',
        body: `Buscan viajar de ${request.originCity} a ${request.destinationCity} el ${request.date}.`,
        data: { travelRequestId: request.id, routeId: option.routeId, type: 'travel_request' },
      })
    }
  }))

  return newlyNotified.length
}

/** Publica las búsquedas que vencieron. Es idempotente y recupera trabajo tras reinicios. */
export async function publishExpiredTravelRequests(): Promise<number> {
  const expired = await prisma.travelRequest.findMany({
    where: { status: 'SEARCHING', searchDeadline: { lte: new Date() } },
    select: {
      id: true, passengerId: true, originCity: true, destinationCity: true, date: true,
      passenger: { select: { pushToken: true } },
    },
  })

  let published = 0
  for (const request of expired) {
    const update = await prisma.travelRequest.updateMany({
      where: { id: request.id, status: 'SEARCHING' },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })
    if (update.count !== 1) continue
    published++
    await prisma.travelRequestEvent.create({ data: { travelRequestId: request.id, type: 'PUBLISHED' } })
    emitToUser(request.passengerId, 'travel-request:status_changed', {
      travelRequestId: request.id,
      status: 'PUBLISHED',
    })
    if (request.passenger.pushToken) {
      await sendPushNotification({
        to: request.passenger.pushToken,
        title: 'Tu viaje está publicado',
        body: `Seguimos buscando conductor para ${request.originCity} → ${request.destinationCity}.`,
        data: { travelRequestId: request.id, type: 'travel_request_published' },
      })
    }
  }
  return published
}
