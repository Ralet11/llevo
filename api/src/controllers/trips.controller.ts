import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'

type TripRouteParams = {
  id: string
}

const createTripSchema = z.object({
  originCity: z.string().min(2),
  destinationCity: z.string().min(2),
  originAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
  departureDate: z.string().datetime(),
  estimatedArrival: z.string().datetime().optional(),
  availableSeats: z.number().int().min(0),
  pricePerSeat: z.number().min(0).optional(),
  availableKg: z.number().min(0),
  pricePerKg: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function createTrip(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createTripSchema.parse(req.body)
    const trip = await prisma.trip.create({
      data: { ...data, driverId: req.userId! },
    })
    res.status(201).json({ trip })
  } catch (err) {
    next(err)
  }
}

export async function getTrips(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { origin, destination, date } = req.query

    const trips = await prisma.trip.findMany({
      where: {
        status: 'OPEN',
        ...(origin && { originCity: { contains: String(origin), mode: 'insensitive' } }),
        ...(destination && { destinationCity: { contains: String(destination), mode: 'insensitive' } }),
        ...(date && {
          departureDate: {
            gte: new Date(String(date)),
            lt: new Date(new Date(String(date)).setDate(new Date(String(date)).getDate() + 1)),
          },
        }),
      },
      include: {
        driver: {
          select: { id: true, name: true, avatarUrl: true, rating: true, ratingCount: true },
        },
      },
      orderBy: { departureDate: 'asc' },
    })

    res.json({ trips })
  } catch (err) {
    next(err)
  }
}

export async function getTripById(req: AuthRequest<TripRouteParams>, res: Response, next: NextFunction) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        driver: {
          select: { id: true, name: true, avatarUrl: true, rating: true, ratingCount: true, isVerified: true },
        },
        passengerRequests: {
          where: { status: 'ACCEPTED' },
          select: { id: true, seats: true, status: true },
        },
        packageRequests: {
          where: { status: 'ACCEPTED' },
          select: { id: true, weightKg: true, status: true },
        },
      },
    })

    if (!trip) throw new AppError('Viaje no encontrado', 404)
    res.json({ trip })
  } catch (err) {
    next(err)
  }
}

export async function requestPassengerSeat(req: AuthRequest<TripRouteParams>, res: Response, next: NextFunction) {
  try {
    const { seats = 1, message } = req.body
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } })
    if (!trip) throw new AppError('Viaje no encontrado', 404)
    if (trip.status !== 'OPEN') throw new AppError('El viaje no está disponible', 400)
    if (trip.driverId === req.userId) throw new AppError('No podés sumarte a tu propio viaje', 400)

    const request = await prisma.tripRequest.create({
      data: { tripId: trip.id, passengerId: req.userId!, seats, message },
    })
    res.status(201).json({ request })
  } catch (err) {
    next(err)
  }
}

export async function requestPackageCarry(req: AuthRequest<TripRouteParams>, res: Response, next: NextFunction) {
  try {
    const { description, weightKg, deliveryAddress, message } = req.body
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } })
    if (!trip) throw new AppError('Viaje no encontrado', 404)
    if (trip.status !== 'OPEN') throw new AppError('El viaje no está disponible', 400)
    if (trip.driverId === req.userId) throw new AppError('No podés enviar paquetes en tu propio viaje', 400)

    const request = await prisma.packageRequest.create({
      data: {
        tripId: trip.id,
        senderId: req.userId!,
        description,
        weightKg,
        deliveryAddress,
        message,
      },
    })
    res.status(201).json({ request })
  } catch (err) {
    next(err)
  }
}
