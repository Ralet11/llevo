import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'

type VehicleParams = { id: string }

const VEHICLE_VALUES = ['MOTO', 'AUTO', 'CAMIONETA', 'CAMION'] as const

const vehicleSchema = z.object({
  type: z.enum(VEHICLE_VALUES),
  licensePlate: z.string().trim().min(1).max(16).optional(),
  model: z.string().trim().min(1).max(60).optional(),
  color: z.string().trim().min(1).max(30).optional(),
  // Asientos para pasajeros (sin contar al conductor).
  seats: z.number().int().min(1).max(20),
})

const updateVehicleSchema = vehicleSchema.partial()

export async function getMyVehicles(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { driverId: req.userId!, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ vehicles })
  } catch (err) {
    next(err)
  }
}

export async function createVehicle(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = vehicleSchema.parse(req.body)
    const vehicle = await prisma.vehicle.create({
      data: { ...data, driverId: req.userId! },
    })
    res.status(201).json({ vehicle })
  } catch (err) {
    next(err)
  }
}

export async function updateVehicle(req: AuthRequest<VehicleParams>, res: Response, next: NextFunction) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } })
    if (!vehicle || !vehicle.isActive) throw new AppError('Vehículo no encontrado', 404)
    if (vehicle.driverId !== req.userId) throw new AppError('No tenés permiso para editar este vehículo', 403)

    const data = updateVehicleSchema.parse(req.body)

    // Si baja los asientos por debajo de lo que alguna ruta ofrece, ajustamos esas
    // rutas para no dejar seatsOffered > seats (invariante que la búsqueda asume).
    if (typeof data.seats === 'number') {
      await prisma.driverRoute.updateMany({
        where: { vehicleId: vehicle.id, seatsOffered: { gt: data.seats } },
        data: { seatsOffered: data.seats },
      })
    }

    const updated = await prisma.vehicle.update({ where: { id: vehicle.id }, data })
    res.json({ vehicle: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteVehicle(req: AuthRequest<VehicleParams>, res: Response, next: NextFunction) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } })
    if (!vehicle || !vehicle.isActive) throw new AppError('Vehículo no encontrado', 404)
    if (vehicle.driverId !== req.userId) throw new AppError('No tenés permiso para eliminar este vehículo', 403)

    // No permitir borrar un vehículo que una ruta activa que lleva pasajeros usa:
    // dejaría esa ruta sin capacidad definida.
    const inUse = await prisma.driverRoute.count({
      where: { vehicleId: vehicle.id, isActive: true, carriesPassengers: true },
    })
    if (inUse > 0) {
      throw new AppError('Este vehículo está en uso por una ruta que lleva pasajeros. Cambialo en la ruta antes de eliminarlo.', 409)
    }

    // Soft delete + desvincular de rutas (que quedan solo para paquetes).
    await prisma.$transaction([
      prisma.driverRoute.updateMany({
        where: { vehicleId: vehicle.id },
        data: { vehicleId: null },
      }),
      prisma.vehicle.update({ where: { id: vehicle.id }, data: { isActive: false } }),
    ])

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
