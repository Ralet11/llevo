import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { buildBypassedDriverVerificationUpdate, isDriverVerificationBypassed } from '../services/didit'

type RouteParams = { id: string }

const DAY_VALUES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const VEHICLE_VALUES = ['MOTO', 'AUTO', 'CAMIONETA', 'CAMION'] as const

// Campos comunes a los dos tipos de ruta. originCity/destinationCity/dias son
// opcionales a nivel schema y se validan segun el kind en el superRefine.
const routeFieldsSchema = z.object({
  kind: z.enum(['INTERCITY', 'LOCAL']).default('INTERCITY'),
  // INTERCITY
  originCity: z.string().min(2).optional(),
  waypointCities: z.array(z.string().min(2)).default([]),
  destinationCity: z.string().min(2).optional(),
  daysOfWeek: z.array(z.enum(DAY_VALUES)).default([]),
  departureTimeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  departureTimeTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  // LOCAL: una sola ciudad de operacion.
  city: z.string().min(2).optional(),
  // Comunes
  vehicleType: z.enum(VEHICLE_VALUES),
  licensePlate: z.string().min(1).optional(),
  vehicleModel: z.string().min(1).optional(),
  vehicleColor: z.string().min(1).optional(),
  maxWeightKg: z.number().positive(),
  pricePerKg: z.number().positive().optional(),
  // Pasajeros: una ruta INTERCITY puede llevar personas ademas de paquetes.
  vehicleId: z.string().optional(),
  carriesPassengers: z.boolean().default(false),
  seatsOffered: z.number().int().min(1).max(20).optional(),
  pricePerSeat: z.number().positive().optional(),
})

const createRouteSchema = routeFieldsSchema.superRefine((data, ctx) => {
  if (data.kind === 'LOCAL') {
    if (!data.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'La ciudad es obligatoria para envios locales.' })
    }
  } else {
    if (!data.originCity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['originCity'], message: 'La ciudad de origen es obligatoria.' })
    }
    if (!data.destinationCity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['destinationCity'], message: 'La ciudad de destino es obligatoria.' })
    }
    if (data.daysOfWeek.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['daysOfWeek'], message: 'Elegí al menos un día.' })
    }
  }

  if (data.carriesPassengers) {
    // Pasajeros solo en rutas entre ciudades por ahora.
    if (data.kind !== 'INTERCITY') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['carriesPassengers'], message: 'Por ahora solo se pueden llevar pasajeros en rutas entre ciudades.' })
    }
    if (!data.vehicleId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicleId'], message: 'Elegí un vehículo para llevar pasajeros.' })
    }
    if (!data.seatsOffered) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['seatsOffered'], message: 'Indicá cuántos asientos ofrecés.' })
    }
    if (data.pricePerSeat == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pricePerSeat'], message: 'Indicá el precio por asiento.' })
    }
  }
})

// Verifica que el vehiculo sea del conductor y que ofrezca <= seats reales.
// Devuelve un mensaje de error o null si esta ok.
async function validatePassengerVehicle(
  driverId: string,
  vehicleId: string | undefined,
  seatsOffered: number | undefined,
): Promise<string | null> {
  if (!vehicleId) return null
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle || !vehicle.isActive) return 'El vehículo seleccionado no existe.'
  if (vehicle.driverId !== driverId) return 'El vehículo seleccionado no es tuyo.'
  if (seatsOffered != null && seatsOffered > vehicle.seats) {
    return `El vehículo tiene ${vehicle.seats} asientos; no podés ofrecer ${seatsOffered}.`
  }
  return null
}

const updateRouteSchema = routeFieldsSchema.partial().extend({
  isActive: z.boolean().optional(),
})

// Mapea el payload validado a las columnas de DriverRoute. Para LOCAL, la ciudad
// se guarda como origen y destino (origin == destination) y sin paradas ni dias.
function toRouteColumns(data: z.infer<typeof routeFieldsSchema>) {
  const common = {
    kind: data.kind,
    vehicleType: data.vehicleType,
    licensePlate: data.licensePlate,
    vehicleModel: data.vehicleModel,
    vehicleColor: data.vehicleColor,
    maxWeightKg: data.maxWeightKg,
    pricePerKg: data.pricePerKg,
    vehicleId: data.vehicleId ?? null,
  }
  if (data.kind === 'LOCAL') {
    // Sin pasajeros en LOCAL por ahora.
    return {
      ...common,
      originCity: data.city!,
      destinationCity: data.city!,
      waypointCities: [],
      daysOfWeek: [],
      carriesPassengers: false,
      seatsOffered: null,
      pricePerSeat: null,
    }
  }
  return {
    ...common,
    originCity: data.originCity!,
    destinationCity: data.destinationCity!,
    waypointCities: data.waypointCities,
    daysOfWeek: data.daysOfWeek,
    departureTimeFrom: data.departureTimeFrom,
    departureTimeTo: data.departureTimeTo,
    carriesPassengers: data.carriesPassengers,
    seatsOffered: data.carriesPassengers ? (data.seatsOffered ?? null) : null,
    pricePerSeat: data.carriesPassengers ? (data.pricePerSeat ?? null) : null,
  }
}

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

    if (isDriverVerificationBypassed()) {
      // Modo dev/QA: saltea telefono + Didit y deja la cuenta como verificada.
      await prisma.user.update({
        where: { id: req.userId! },
        data: buildBypassedDriverVerificationUpdate(req.userId!),
      })
    } else {
      if (!user.phoneVerifiedAt) {
        throw new AppError('Debes verificar tu telefono antes de activar el modo conductor', 403)
      }
      if (user.driverVerificationStatus !== 'APPROVED') {
        throw new AppError('Debes completar la verificacion de conductor con Didit antes de crear rutas', 403)
      }
    }

    if (data.carriesPassengers) {
      const vehicleError = await validatePassengerVehicle(req.userId!, data.vehicleId, data.seatsOffered)
      if (vehicleError) throw new AppError(vehicleError, 400)
    }

    const route = await prisma.driverRoute.create({
      data: { ...toRouteColumns(data), driverId: req.userId! },
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

    // `city` (local) no es columna: si viene, se mapea a origen y destino.
    const { city, ...rest } = updateRouteSchema.parse(req.body)

    // Si la ruta va a llevar pasajeros (ya sea porque se activa ahora o porque ya
    // lo hacía y se cambia vehículo/asientos), revalidar contra el vehículo real.
    const effectiveCarries = rest.carriesPassengers ?? route.carriesPassengers
    if (effectiveCarries) {
      const effectiveVehicleId = rest.vehicleId ?? route.vehicleId ?? undefined
      const effectiveSeats = rest.seatsOffered ?? route.seatsOffered ?? undefined
      const vehicleError = await validatePassengerVehicle(req.userId!, effectiveVehicleId, effectiveSeats)
      if (vehicleError) throw new AppError(vehicleError, 400)
    }

    const data = city ? { ...rest, originCity: city, destinationCity: city } : rest
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
