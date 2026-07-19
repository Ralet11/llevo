import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { normalize } from '../lib/matching'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from '../services/notifications'

type BookingParams = { id: string }

// Estados que "reservan" un asiento (cuentan contra la capacidad).
const HOLD_STATUSES = ['APPROVED', 'PAID'] as const

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

    const route = await prisma.driverRoute.findUnique({
      where: { id: data.routeId },
      include: { driver: { select: { id: true, pushToken: true } } },
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
    const dayOff = await prisma.driverDayOff.findFirst({ where: { driverId: route.driverId, date: dateKey } })
    if (dayOff) throw new AppError('El conductor no está disponible ese día', 400)

    // Ya tiene una solicitud activa para esta ruta+fecha.
    const existing = await prisma.rideBooking.findFirst({
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
    const held = await heldSeats(route.id, dateKey)
    if (seatsOffered - held < data.seats) {
      throw new AppError('Ya no quedan lugares suficientes en ese viaje', 409)
    }

    const booking = await prisma.rideBooking.create({
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
        status: { in: ['PENDING', 'APPROVED', 'PAID'] },
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
    const { action } = req.body as { action: 'approve' | 'reject' }
    if (action !== 'approve' && action !== 'reject') throw new AppError('Acción inválida', 400)

    const booking = await prisma.rideBooking.findUnique({
      where: { id: req.params.id },
      include: {
        route: { select: { id: true, driverId: true, seatsOffered: true, originCity: true, destinationCity: true } },
        passenger: { select: { id: true, pushToken: true } },
      },
    })
    if (!booking) throw new AppError('Solicitud no encontrada', 404)
    if (booking.route.driverId !== req.userId) throw new AppError('No tenés permiso sobre esta solicitud', 403)
    if (booking.status !== 'PENDING') throw new AppError('Esta solicitud ya fue respondida', 400)

    if (action === 'reject') {
      await prisma.rideBooking.update({ where: { id: booking.id }, data: { status: 'REJECTED' } })
      emitToUser(booking.passengerId, 'ride:status_changed', { bookingId: booking.id, status: 'REJECTED' })
      if (booking.passenger.pushToken) {
        await sendPushNotification({
          to: booking.passenger.pushToken,
          title: 'Solicitud rechazada',
          body: `El conductor no pudo sumarte al viaje ${booking.route.originCity} → ${booking.route.destinationCity}.`,
          data: { bookingId: booking.id, type: 'ride_rejected' },
        })
      }
      return res.json({ ok: true, status: 'REJECTED' })
    }

    // Aprobar: revalidar capacidad de forma atómica.
    const updated = await prisma.$transaction(async tx => {
      const agg = await tx.rideBooking.aggregate({
        where: { routeId: booking.route.id, date: booking.date, status: { in: [...HOLD_STATUSES] } },
        _sum: { seats: true },
      })
      const held = agg._sum.seats ?? 0
      const seatsOffered = booking.route.seatsOffered ?? 0
      if (seatsOffered - held < booking.seats) {
        throw new AppError('Ya no quedan lugares para aprobar esta solicitud', 409)
      }
      return tx.rideBooking.update({ where: { id: booking.id }, data: { status: 'APPROVED' } })
    })

    emitToUser(booking.passengerId, 'ride:status_changed', { bookingId: booking.id, status: 'APPROVED' })
    if (booking.passenger.pushToken) {
      await sendPushNotification({
        to: booking.passenger.pushToken,
        title: '¡Te aceptaron en el viaje!',
        body: `Ya podés pagar tu lugar en ${booking.route.originCity} → ${booking.route.destinationCity}.`,
        data: { bookingId: booking.id, type: 'ride_approved' },
      })
    }

    res.json({ ok: true, status: updated.status })
  } catch (err) {
    next(err)
  }
}

// Pasajero cancela su solicitud (mientras no esté pagada).
export async function cancelBooking(req: AuthRequest<BookingParams>, res: Response, next: NextFunction) {
  try {
    const booking = await prisma.rideBooking.findUnique({
      where: { id: req.params.id },
      include: { route: { select: { driverId: true } } },
    })
    if (!booking) throw new AppError('Solicitud no encontrada', 404)
    if (booking.passengerId !== req.userId) throw new AppError('No tenés permiso sobre esta solicitud', 403)
    if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
      throw new AppError('Esta solicitud ya no se puede cancelar', 400)
    }

    await prisma.rideBooking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } })
    emitToUser(booking.route.driverId, 'ride:status_changed', { bookingId: booking.id, status: 'CANCELLED' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
