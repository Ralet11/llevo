import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { normalize } from '../lib/matching'
import { ACTIVE_TRAVEL_REQUEST_STATUSES, assertTravelRequestTransition } from '../lib/travelRequestState'
import { matchTravelRequest } from '../services/travelRequestMatching'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from '../services/notifications'

type TravelRequestParams = { id: string }
const SEARCH_WINDOW_MS = 15 * 60 * 1000

const createTravelRequestSchema = z.object({
  originCity: z.string().trim().min(2).max(120),
  destinationCity: z.string().trim().min(2).max(120),
  date: z.string().datetime(),
  seats: z.number().int().min(1).max(8).default(1),
})
const createRouteAlertSchema = z.object({
  originCity: z.string().trim().min(2).max(120),
  destinationCity: z.string().trim().min(2).max(120),
  date: z.string().datetime(),
})

function argentinaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(date)
}

function startOfArgentinaToday(): string {
  return argentinaDateKey(new Date())
}

export async function createRouteAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createRouteAlertSchema.parse(req.body)
    const dateKey = argentinaDateKey(new Date(data.date))
    if (dateKey < startOfArgentinaToday()) throw new AppError('La fecha no puede ser anterior a hoy', 400)
    if (normalize(data.originCity) === normalize(data.destinationCity)) throw new AppError('Elegí dos ciudades distintas', 400)
    const alert = await prisma.routeAlert.upsert({
      where: { userId_originCity_destinationCity_date: { userId: req.userId!, originCity: data.originCity, destinationCity: data.destinationCity, date: dateKey } },
      update: { cancelledAt: null, notifiedAt: null },
      create: { userId: req.userId!, originCity: data.originCity, destinationCity: data.destinationCity, date: dateKey },
    })
    res.status(201).json({ alert })
  } catch (err) { next(err) }
}

export async function getMyRouteAlerts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alerts = await prisma.routeAlert.findMany({
      where: { userId: req.userId!, cancelledAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    res.json({ alerts })
  } catch (err) { next(err) }
}

export async function cancelRouteAlert(req: AuthRequest<TravelRequestParams>, res: Response, next: NextFunction) {
  try {
    const result = await prisma.routeAlert.updateMany({
      where: { id: req.params.id, userId: req.userId!, cancelledAt: null },
      data: { cancelledAt: new Date() },
    })
    if (result.count !== 1) throw new AppError('El seguimiento no existe o ya fue eliminado', 404)
    res.json({ ok: true })
  } catch (err) { next(err) }
}

const requestInclude = {
  matchedRoute: {
    select: { id: true, originCity: true, destinationCity: true, departureTimeFrom: true, departureTimeTo: true },
  },
  booking: { select: { id: true, status: true } },
} as const

export async function createTravelRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createTravelRequestSchema.parse(req.body)
    const date = new Date(data.date)
    const dateKey = argentinaDateKey(date)
    if (dateKey < startOfArgentinaToday()) throw new AppError('La fecha del viaje no puede ser anterior a hoy', 400)
    if (normalize(data.originCity) === normalize(data.destinationCity)) {
      throw new AppError('El origen y destino deben ser ciudades distintas', 400)
    }

    const existing = await prisma.travelRequest.findFirst({
      where: {
        passengerId: req.userId!,
        date: dateKey,
        seats: data.seats,
        status: { in: [...ACTIVE_TRAVEL_REQUEST_STATUSES] },
        originCity: { equals: data.originCity, mode: 'insensitive' },
        destinationCity: { equals: data.destinationCity, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (existing) throw new AppError('Ya tenés una solicitud activa para este viaje', 409)

    const travelRequest = await prisma.travelRequest.create({
      data: {
        passengerId: req.userId!,
        originCity: data.originCity,
        destinationCity: data.destinationCity,
        date: dateKey,
        seats: data.seats,
        searchDeadline: new Date(Date.now() + SEARCH_WINDOW_MS),
        events: { create: { type: 'CREATED', actorUserId: req.userId! } },
      },
      include: requestInclude,
    })

    // El matching es parte del alta: los candidatos se persisten antes de
    // notificar. Un problema de push no invalida la intención del pasajero.
    let candidateCount = 0
    try {
      candidateCount = await matchTravelRequest(travelRequest)
    } catch (matchError) {
      console.error('[travel-request] matching_failed', matchError)
    }

    res.status(201).json({ travelRequest, candidateCount })
  } catch (err) {
    next(err)
  }
}

export async function getMyTravelRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const travelRequests = await prisma.travelRequest.findMany({
      where: { passengerId: req.userId! },
      include: requestInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    })
    res.json({ travelRequests })
  } catch (err) {
    next(err)
  }
}

export async function getMyTravelRequest(req: AuthRequest<TravelRequestParams>, res: Response, next: NextFunction) {
  try {
    const travelRequest = await prisma.travelRequest.findFirst({
      where: { id: req.params.id, passengerId: req.userId! },
      include: requestInclude,
    })
    if (!travelRequest) throw new AppError('Solicitud de viaje no encontrada', 404)
    res.json({ travelRequest })
  } catch (err) {
    next(err)
  }
}

export async function cancelTravelRequest(req: AuthRequest<TravelRequestParams>, res: Response, next: NextFunction) {
  try {
    const travelRequest = await prisma.travelRequest.findFirst({
      where: { id: req.params.id, passengerId: req.userId! },
      select: { id: true, status: true },
    })
    if (!travelRequest) throw new AppError('Solicitud de viaje no encontrada', 404)
    assertTravelRequestTransition(travelRequest.status, 'CANCELLED')

    // La condición incluye el estado observado: si un job o conductor lo cambió
    // entre la lectura y esta operación, no se cancela un estado equivocado.
    const result = await prisma.travelRequest.updateMany({
      where: { id: travelRequest.id, passengerId: req.userId!, status: travelRequest.status },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })
    if (result.count !== 1) throw new AppError('La solicitud cambió de estado; actualizá e intentá de nuevo', 409)
    await prisma.travelRequestEvent.create({
      data: { travelRequestId: travelRequest.id, type: 'CANCELLED', actorUserId: req.userId! },
    })

    const updated = await prisma.travelRequest.findUniqueOrThrow({
      where: { id: travelRequest.id },
      include: requestInclude,
    })
    res.json({ travelRequest: updated })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No se puede pasar una solicitud')) {
      next(new AppError('Esta solicitud ya no se puede cancelar', 409))
      return
    }
    next(err)
  }
}

export async function getDriverTravelOpportunities(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const opportunities = await prisma.travelRequestCandidate.findMany({
      where: {
        driverId: req.userId!,
        status: 'NOTIFIED',
        travelRequest: { status: { in: ['SEARCHING', 'PUBLISHED'] } },
      },
      include: {
        route: { select: { id: true, originCity: true, destinationCity: true, departureTimeFrom: true, departureTimeTo: true } },
        travelRequest: {
          select: {
            id: true, originCity: true, destinationCity: true, date: true, seats: true,
            status: true, searchDeadline: true, publishedAt: true, createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json({ opportunities })
  } catch (err) {
    next(err)
  }
}

export async function respondToTravelRequest(req: AuthRequest<TravelRequestParams>, res: Response, next: NextFunction) {
  try {
    const action = z.enum(['accept', 'reject']).parse((req.body as { action?: unknown }).action)
    const candidate = await prisma.travelRequestCandidate.findFirst({
      where: { travelRequestId: req.params.id, driverId: req.userId!, status: 'NOTIFIED' },
      include: {
        route: { select: { id: true, driverId: true, seatsOffered: true, pricePerSeat: true } },
        travelRequest: { include: { passenger: { select: { pushToken: true } } } },
      },
    })
    if (!candidate) throw new AppError('Esta oportunidad ya no está disponible', 404)

    if (action === 'reject') {
      await prisma.travelRequestCandidate.update({
        where: { id: candidate.id },
        data: { status: 'REJECTED', respondedAt: new Date() },
      })
      return res.json({ ok: true, status: 'REJECTED' })
    }

    const { travelRequest, booking } = await prisma.$transaction(async tx => {
      const claimed = await tx.travelRequest.updateMany({
        where: { id: candidate.travelRequestId, status: { in: ['SEARCHING', 'PUBLISHED'] } },
        data: { status: 'MATCHED', matchedAt: new Date(), matchedRouteId: candidate.routeId },
      })
      if (claimed.count !== 1) throw new AppError('Otro conductor ya tomó esta solicitud', 409)

      const held = await tx.rideBooking.aggregate({
        where: { routeId: candidate.routeId, date: candidate.travelRequest.date, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { seats: true },
      })
      if ((candidate.route.seatsOffered ?? 0) - (held._sum.seats ?? 0) < candidate.travelRequest.seats) {
        throw new AppError('Ya no quedan lugares suficientes para este viaje', 409)
      }

      const nextBooking = await tx.rideBooking.create({
        data: {
          travelRequestId: candidate.travelRequestId,
          routeId: candidate.routeId,
          passengerId: candidate.travelRequest.passengerId,
          date: candidate.travelRequest.date,
          seats: candidate.travelRequest.seats,
          originCity: candidate.travelRequest.originCity,
          destinationCity: candidate.travelRequest.destinationCity,
          pricePerSeat: candidate.route.pricePerSeat,
          status: 'APPROVED',
        },
      })
      await tx.travelRequestCandidate.update({ where: { id: candidate.id }, data: { status: 'ACCEPTED', respondedAt: new Date() } })
      await tx.travelRequestCandidate.updateMany({
        where: { travelRequestId: candidate.travelRequestId, id: { not: candidate.id }, status: 'NOTIFIED' },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      })
      await tx.travelRequestEvent.create({
        data: {
          travelRequestId: candidate.travelRequestId,
          type: 'MATCHED',
          actorUserId: req.userId!,
          metadata: { routeId: candidate.routeId, bookingId: nextBooking.id },
        },
      })
      const nextRequest = await tx.travelRequest.findUniqueOrThrow({ where: { id: candidate.travelRequestId }, include: requestInclude })
      return { travelRequest: nextRequest, booking: nextBooking }
    })

    emitToUser(travelRequest.passengerId, 'travel-request:status_changed', { travelRequestId: travelRequest.id, status: 'MATCHED' })
    emitToUser(travelRequest.passengerId, 'ride:status_changed', { bookingId: booking.id, status: 'APPROVED' })
    if (candidate.travelRequest.passenger.pushToken) {
      await sendPushNotification({
        to: candidate.travelRequest.passenger.pushToken,
        title: '¡Encontramos tu viaje!',
        body: `Un conductor aceptó tu viaje ${travelRequest.originCity} → ${travelRequest.destinationCity}.`,
        data: { travelRequestId: travelRequest.id, bookingId: booking.id, type: 'travel_request_matched' },
      })
    }
    res.json({ ok: true, travelRequest, booking })
  } catch (err) {
    next(err)
  }
}
