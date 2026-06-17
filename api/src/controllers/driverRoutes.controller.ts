import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { buildBypassedDriverVerificationUpdate, isDriverVerificationBypassed } from '../services/didit'

type RouteParams = { id: string }

const DAY_VALUES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const VEHICLE_VALUES = ['MOTO', 'AUTO', 'CAMIONETA', 'CAMION'] as const

const createRouteSchema = z.object({
  originCity: z.string().min(2),
  waypointCities: z.array(z.string().min(2)).default([]),
  destinationCity: z.string().min(2),
  daysOfWeek: z.array(z.enum(DAY_VALUES)).min(1),
  departureTimeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  departureTimeTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  vehicleType: z.enum(VEHICLE_VALUES),
  licensePlate: z.string().min(1).optional(),
  vehicleModel: z.string().min(1).optional(),
  vehicleColor: z.string().min(1).optional(),
  maxWeightKg: z.number().positive(),
  pricePerKg: z.number().positive().optional(),
})

const updateRouteSchema = createRouteSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export async function createDriverRoute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createRouteSchema.parse(req.body)
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        phoneVerifiedAt: true,
        driverVerificationStatus: true,
      },
    })

    if (!user) throw new AppError('Usuario no encontrado', 404)
    if (!user.phoneVerifiedAt) {
      throw new AppError('Debes verificar tu telefono antes de activar el modo conductor', 403)
    }
    if (isDriverVerificationBypassed()) {
      await prisma.user.update({
        where: { id: req.userId! },
        data: buildBypassedDriverVerificationUpdate(req.userId!),
      })
    }
    if (user.driverVerificationStatus !== 'APPROVED') {
      if (!isDriverVerificationBypassed()) {
        throw new AppError('Debes completar la verificacion de conductor con Didit antes de crear rutas', 403)
      }
    }

    const route = await prisma.driverRoute.create({
      data: { ...data, driverId: req.userId! },
    })
    res.status(201).json({ route })
  } catch (err) {
    next(err)
  }
}

export async function getMyRoutes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const routes = await prisma.driverRoute.findMany({
      where: { driverId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ routes })
  } catch (err) {
    next(err)
  }
}

export async function updateDriverRoute(req: AuthRequest<RouteParams>, res: Response, next: NextFunction) {
  try {
    const route = await prisma.driverRoute.findUnique({ where: { id: req.params.id } })
    if (!route) throw new AppError('Ruta no encontrada', 404)
    if (route.driverId !== req.userId) throw new AppError('No tenés permiso para editar esta ruta', 403)

    const data = updateRouteSchema.parse(req.body)
    const updated = await prisma.driverRoute.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ route: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteDriverRoute(req: AuthRequest<RouteParams>, res: Response, next: NextFunction) {
  try {
    const route = await prisma.driverRoute.findUnique({ where: { id: req.params.id } })
    if (!route) throw new AppError('Ruta no encontrada', 404)
    if (route.driverId !== req.userId) throw new AppError('No tenés permiso para eliminar esta ruta', 403)

    await prisma.driverRoute.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    res.json({ message: 'Ruta desactivada correctamente' })
  } catch (err) {
    next(err)
  }
}
