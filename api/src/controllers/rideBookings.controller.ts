import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { normalize } from '../lib/matching'
import { serializable } from '../lib/transaction'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from '../services/notifications'
import { isDemoRideBotEmail, scheduleDemoRideApproval } from '../services/demoRideBot'

type BookingParams = { id: string }

// Estados que "reservan" un asiento (cuentan contra la capacidad).
const HOLD_STATUSES = ['APPROVED', 'PAID'] as const

export async function completeBooking(req: AuthRequest<BookingParams>, res: Response, next: NextFunction) {
  try {
    const booking = await serializable(async tx => {
      const b = await tx.rideBooking.findFirst({ where: { id: req.params.id, route: { driverId: req.userId! } }, include: { payment: true } })
      if (!b) throw new AppError('Reserva no encontrada', 404)
      if (b.status === 'COMPLETED') return b
      if (b.status !== 'PAID' || b.payment?.status !== 'IN_ESCROW') throw new AppError('Primero debe confirmarse el pago de prueba', 409)
      await tx.rideBooking.update({ where: { id: b.id }, data: { status: 'COMPLETED' } })
      await tx.payment.update({ where: { id: b.payment.id }, data: { status: 'RELEASED' } })
      if (b.travelRequestId) await tx.travelRequest.update({ where: { id: b.travelRequestId }, data: { status: 'COMPLETED' } })
      return b
    })
    emitToUser(booking.passengerId, 'ride:status_changed', { bookingId: booking.id, status: 'COMPLETED' })
    res.json({ ok: true })
  } catch (err) { next(err) }
}

function argentinaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(date)
}

function argentinaWeekday(date: Date): string {
  return new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
    .format(date).toUpperCase()
}

// Asientos ya reservados (APPROVED/PAID) para una ruta en una fecha.
async function heldSeats(routeId: string, date: string): Promise<number> {
  const agg = await prisma.rideBooking.aggregate({
    where: { routeId, date, status: { in: [...HOLD_STATUSES] } },
    _sum: { seats: true },
  })
  return agg._sum.seats ?? 0
}

function routeCoversCorridor(
  route: { originCity: string; waypointCities: string[]; destinationCity: string },
  originCity: string,
  destinationCity: string,
): boolean {
  const cities = [route.originCity, ...route.waypointCities, route.destinationCity].map(normalize)
  const oi = cities.indexOf(normalize(originCity))
  const di = cities.indexOf(normalize(destinationCity))
  return oi !== -1 && di !== -1 && oi < di
}

const createBookingSchema = z.object({
  routeId: z.string().min(1),
  date: z.string().datetime(),
  seats: z.number().int().min(1).max(8),
  originCity: z.string().min(1),
  destinationCity: z.string().min(1),
})

// Pasajero solicita sumarse a una ruta en una fecha concreta.
export async function createBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createBookingSchema.parse(req.body)
    const dateKey = argentinaDateKey(new Date(data.date))
    if (dateKey < argentinaDateKey(new Date())) throw new AppError('La fecha no puede estar en el pasado', 400)

    const { booking, route } = await serializable(async tx => {
    const route = await tx.driverRoute.findUnique({
      where: { id: data.routeId },
      include: { driver: { select: { id: true, email: true, pushToken: true } } },
    })

    if (!route || !route.isActive) throw new AppError('El viaje ya no está disponible', 404)
    if (route.kind !== 'INTERCITY' || !route.carriesPassengers) throw new AppError('Este viaje no lleva pasajeros', 400)
    if (route.driverId === req.userId) throw new AppError('No podés sumarte a tu propio viaje', 400)
    if (!routeCoversCorridor(route, data.originCity, data.destinationCity)) {
      throw new AppError('Ese recorrido no coincide con el viaje', 400)
    }
    if (!(route.daysOfWeek as string[]).includes(argentinaWeekday(new Date(data.date)))) {
      throw new AppError('El conductor no viaja ese día', 400)
    }

    // Conductor marcó ese día como no disponible.
    const dayOff = await tx.driverDayOff.findFirst({ where: { driverId: route.driverId, date: dateKey } })
    if (dayOff) throw new AppError('El conductor no está disponible ese día', 400)

    // Ya tiene una solicitud activa para esta ruta+fecha.
    const existing = await tx.rideBooking.findFirst({
      where: {
        routeId: route.id,
        passengerId: req.userId!,
        date: dateKey,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] },
      },
      select: { id: true },
    })
    if (existing) throw new AppError('Ya tenés una solicitud activa para este viaje', 409)

    // Capacidad: asientos ofrecidos menos los ya reservados.
    const seatsOffered = route.seatsOffered ?? 0
    const held = (await tx.rideBooking.aggregate({ where: { routeId: route.id, date: dateKey, status: { in: [...HOLD_STATUSES] } }, _sum: { seats: true } }))._sum.seats ?? 0
    if (seatsOffered - held < data.seats) {
      throw new AppError('Ya no quedan lugares suficientes en ese viaje', 409)
    }

    const booking = await tx.rideBooking.create({
      data: {
        routeId: route.id,
        passengerId: req.userId!,
        date: dateKey,
        seats: data.seats,
        originCity: data.originCity,
        destinationCity: data.destinationCity,
        pricePerSeat: route.pricePerSeat,
      },
    })

      return { booking, route }
    })

    // Avisar al conductor.
    const passenger = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } })
    emitToUser(route.driverId, 'ride:new_request', { bookingId: booking.id })
    if (route.driver.pushToken) {
      await sendPushNotification({
        to: route.driver.pushToken,
        title: 'Nueva solicitud de viaje',
        body: `${passenger?.name ?? 'Un pasajero'} quiere sumarse a tu viaje ${route.originCity} → ${route.destinationCity}.`,
        data: { bookingId: booking.id, type: 'ride_request' },
      })
    }
    if (isDemoRideBotEmail(route.driver.email)) scheduleDemoRideApproval(booking.id)

    res.status(201).json({ booking })
  } catch (err) {
    next(err)
  }
}

// Reservas del pasajero (sus solicitudes).
export async function getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bookings = await prisma.rideBooking.findMany({
      where: { passengerId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        route: {
          select: {
            originCity: true, destinationCity: true, departureTimeFrom: true, departureTimeTo: true,
            driver: { select: { id: true, name: true, avatarUrl: true, rating: true, ratingCount: true } },
          },
        },
      },
    })
    res.json({ bookings })
  } catch (err) {
    next(err)
  }
}

// Solicitudes entrantes para las rutas del conductor.
export async function getRideRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bookings = await prisma.rideBooking.findMany({
      where: {
        route: { driverId: req.userId! },
        status: { in: ['PENDING', 'APPROVED', 'PAID', 'COMPLETED'] },
      },
      orderBy: [{ status: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }],
      take: 100,
      include: {
        route: { select: { id: true, originCity: true, destinationCity: true, departureTimeFrom: true } },
        passenger: { select: { id: true, name: true, avatarUrl: true, rating: true, ratingCount: true } },
      },
    })
    res.json({ bookings })
  } catch (err) {
    next(err)
  }
}

// Conductor aprueba o rechaza una solicitud.
export async function respondBooking(req: AuthRequest<BookingParams>, res: Response, next: NextFunction) {
  try {
    const action = z.enum(['approve', 'reject']).parse(req.body.action)
    const result = await serializable(async tx => {
      const booking = await tx.rideBooking.findUnique({ where: { id: req.params.id }, include: { route: true } })
      if (!booking || booking.route.driverId !== req.userId) throw new AppError('Solicitud no encontrada', 404)
      if (booking.status !== 'PENDING') throw new AppError('Esta solicitud ya fue respondida', 409)
      if (action === 'approve') {
        const route = booking.route
        const driver = await tx.user.findUnique({ where: { id: req.userId! } })
        if (!driver?.isActive || driver.driverVerificationStatus !== 'APPROVED') throw new AppError('Conductor no habilitado', 403)
        if (!route.isActive || !route.carriesPassengers || booking.date < argentinaDateKey(new Date())) throw new AppError('El viaje ya no está disponible', 409)
        const dayOff = await tx.driverDayOff.findFirst({ where: { driverId: req.userId!, date: booking.date } })
        if (dayOff) throw new AppError('No estás disponible ese día', 409)
        const held = await tx.rideBooking.aggregate({
          where: { routeId: route.id, date: booking.date, status: { in: [...HOLD_STATUSES] } }, _sum: { seats: true },
        })
        if ((held._sum.seats ?? 0) + booking.seats > (route.seatsOffered ?? 0)) throw new AppError('No quedan lugares suficientes', 409)
      }
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      await tx.rideBooking.update({ where: { id: booking.id }, data: { status } })
      return { booking, status }
    })
    emitToUser(result.booking.passengerId, 'ride:status_changed', { bookingId: result.booking.id, status: result.status })
    const passenger = await prisma.user.findUnique({ where: { id: result.booking.passengerId }, select: { pushToken: true } })
    if (passenger?.pushToken) await sendPushNotification({
      to: passenger.pushToken, title: 'Tu solicitud cambió de estado',
      body: result.status === 'APPROVED' ? 'El conductor aceptó. Confirmá tu pago de prueba desde Mis viajes.' : 'El conductor rechazó la solicitud.',
      data: { bookingId: result.booking.id, type: 'ride_status' },
    })
    res.json({ ok: true, status: result.status })
  } catch (err) { next(err) }
}

export async function cancelBooking(req: AuthRequest<BookingParams>, res: Response, next: NextFunction) {
  try {
    const booking = await serializable(async tx => {
      const b = await tx.rideBooking.findFirst({ where: { id: req.params.id, passengerId: req.userId! }, include: { route: true, payment: true } })
      if (!b) throw new AppError('Solicitud no encontrada', 404)
      if (!['PENDING', 'APPROVED', 'PAID'].includes(b.status)) throw new AppError('Esta solicitud ya no se puede cancelar', 409)
      if (b.payment) {
        if (!b.payment.externalId?.startsWith('internal:')) throw new AppError('Este pago requiere revisión manual', 409)
        await tx.payment.update({ where: { id: b.payment.id }, data: { status: 'REFUNDED' } })
      }
      await tx.rideBooking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } })
      if (b.travelRequestId) await tx.travelRequest.update({ where: { id: b.travelRequestId }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
      return b
    })
    emitToUser(booking.route.driverId, 'ride:status_changed', { bookingId: booking.id, status: 'CANCELLED' })
    res.json({ ok: true })
  } catch (err) { next(err) }
}
