import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { findPassengerTrips } from '../lib/matching'

type TripRouteParams = {
  id: string
}

const searchTripsSchema = z.object({
  originCity: z.string().min(1),
  destinationCity: z.string().min(1),
  date: z.string().datetime(),
})

// Pasajero busca viajes que cubren A -> B en una fecha. Devuelve opciones con
// horario, asientos libres, precio y perfil del conductor.
export async function searchTrips(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { originCity, destinationCity, date } = searchTripsSchema.parse({
      originCity: req.query.originCity,
      destinationCity: req.query.destinationCity,
      date: req.query.date,
    })

    const result = await findPassengerTrips({
      originCity,
      destinationCity,
      date: new Date(date),
      passengerId: req.userId!,
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
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

const passengerRequestSchema = z.object({
  seats: z.number().int().min(1).max(8).default(1),
  message: z.string().trim().max(500).optional(),
})

const packageRequestSchema = z.object({
  description: z.string().trim().min(3).max(200),
  weightKg: z.number().positive().max(1000),
  deliveryAddress: z.string().trim().max(300).optional(),
  message: z.string().trim().max(500).optional(),
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
    const { seats, message } = passengerRequestSchema.parse(req.body)
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } })
    if (!trip) throw new AppError('Viaje no encontrado', 404)
    if (trip.status !== 'OPEN') throw new AppError('El viaje no esta disponible', 400)
    if (trip.driverId === req.userId) throw new AppError('No podes sumarte a tu propio viaje', 400)
    if (trip.availableSeats < seats) throw new AppError('No hay asientos suficientes disponibles', 400)

    const [existingRequest, acceptedSeats] = await Promise.all([
      prisma.tripRequest.findFirst({
        where: {
          tripId: trip.id,
          passengerId: req.userId!,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
        select: { id: true },
      }),
      prisma.tripRequest.aggregate({
        where: {
          tripId: trip.id,
          status: 'ACCEPTED',
        },
        _sum: { seats: true },
      }),
    ])

    if (existingRequest) {
      throw new AppError('Ya tienes una solicitud activa para este viaje', 409)
    }

    const occupiedSeats = acceptedSeats._sum.seats ?? 0
    if (occupiedSeats + seats > trip.availableSeats) {
      throw new AppError('La capacidad del viaje ya no alcanza para esa cantidad de asientos', 409)
    }

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
    const { description, weightKg, deliveryAddress, message } = packageRequestSchema.parse(req.body)
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } })
    if (!trip) throw new AppError('Viaje no encontrado', 404)
    if (trip.status !== 'OPEN') throw new AppError('El viaje no esta disponible', 400)
    if (trip.driverId === req.userId) throw new AppError('No podes enviar paquetes en tu propio viaje', 400)
    if (trip.availableKg < weightKg) throw new AppError('El viaje no tiene capacidad suficiente para ese peso', 400)

    const [existingRequest, acceptedWeight] = await Promise.all([
      prisma.packageRequest.findFirst({
        where: {
          tripId: trip.id,
          senderId: req.userId!,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
        select: { id: true },
      }),
      prisma.packageRequest.aggregate({
        where: {
          tripId: trip.id,
          status: 'ACCEPTED',
        },
        _sum: { weightKg: true },
      }),
    ])

    if (existingRequest) {
      throw new AppError('Ya tienes una solicitud activa de paquete para este viaje', 409)
    }

    const occupiedKg = acceptedWeight._sum.weightKg ?? 0
    if (occupiedKg + weightKg > trip.availableKg) {
      throw new AppError('La capacidad del viaje ya no alcanza para ese paquete', 409)
    }

    const request = await prisma.packageRequest.create({
      data: {
        tripId: trip.id,
        senderId: req.userId!,
        description,
        weightKg,
        deliveryAddress: deliveryAddress?.trim() || undefined,
        message,
      },
    })
    res.status(201).json({ request })
  } catch (err) {
    next(err)
  }
}
