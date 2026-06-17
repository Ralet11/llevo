import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { findCandidateDrivers } from '../lib/matching'
import { notifyNextCandidate, advanceQueue } from '../services/shipmentQueue'
import { sendPushNotification } from '../services/notifications'

type ShipmentParams = { id: string }

const SIZE_VALUES = ['SMALL', 'MEDIUM', 'LARGE', 'BULKY'] as const

const createShipmentSchema = z.object({
  originCity: z.string().min(1),
  destinationCity: z.string().min(1),
  originAddress: z.string().min(1),
  deliveryAddress: z.string().min(1),
  weightKg: z.number().positive(),
  packageSize: z.enum(SIZE_VALUES),
  preferredDate: z.string().datetime().optional(),
  pickupContactName: z.string().min(1),
  pickupContactPhone: z.string().min(1),
  recipientDetails: z.string().optional(),
  notes: z.string().optional(),
})

export async function createShipment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createShipmentSchema.parse(req.body)

    const preferredDateObj = data.preferredDate ? new Date(data.preferredDate) : undefined

    const candidates = await findCandidateDrivers({
      originCity: data.originCity,
      destinationCity: data.destinationCity,
      weightKg: data.weightKg,
      preferredDate: preferredDateObj,
      senderId: req.userId!,
    })

    const candidateDriverIds = candidates.map(c => c.driverId)
    const status = candidateDriverIds.length === 0 ? 'NO_COVERAGE' : 'SEARCHING'

    const shipment = await prisma.shipment.create({
      data: {
        ...data,
        recipientDetails: data.recipientDetails ?? '',
        preferredDate: preferredDateObj,
        senderId: req.userId!,
        status,
        candidateDriverIds,
      },
    })

    // Future shipments (preferredDate > 3h from now) show up in the driver's upcoming panel
    // rather than triggering an immediate push notification
    const FUTURE_THRESHOLD_MS = 3 * 60 * 60 * 1000
    const isFutureShipment = preferredDateObj &&
      preferredDateObj.getTime() - Date.now() > FUTURE_THRESHOLD_MS

    if (status === 'SEARCHING' && !isFutureShipment) {
      notifyNextCandidate(shipment.id).catch(err =>
        console.error('[queue] Error notificando primer candidato:', err)
      )
    }

    res.status(201).json({ shipment, candidatesFound: candidateDriverIds.length })
  } catch (err) {
    next(err)
  }
}

export async function getShipmentById(req: AuthRequest<ShipmentParams>, res: Response, next: NextFunction) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        job: {
          include: {
            driver: {
              select: { id: true, name: true, avatarUrl: true, rating: true, ratingCount: true, phone: true },
            },
          },
        },
      },
    })

    if (!shipment) throw new AppError('Pedido no encontrado', 404)
    if (shipment.senderId !== req.userId) throw new AppError('No tenés permiso para ver este pedido', 403)

    res.json({ shipment })
  } catch (err) {
    next(err)
  }
}

export async function getMyShipments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const shipments = await prisma.shipment.findMany({
      where: { senderId: req.userId! },
      include: {
        job: {
          include: {
            driver: {
              select: { id: true, name: true, avatarUrl: true, rating: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({ shipments })
  } catch (err) {
    next(err)
  }
}

// Conductor ve el pedido que tiene pendiente de respuesta
export async function getPendingForDriver(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const shipment = await prisma.shipment.findFirst({
      where: {
        status: 'SEARCHING',
        candidateDriverIds: { has: req.userId! },
      },
      orderBy: { lastNotifiedAt: 'desc' },
    })

    // Solo mostrar si este conductor es el primero de la cola
    if (!shipment || shipment.candidateDriverIds[0] !== req.userId) {
      return res.json({ shipment: null })
    }

    res.json({ shipment })
  } catch (err) {
    next(err)
  }
}

// Conductor consulta su trabajo activo
export async function getActiveJobForDriver(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const job = await prisma.shipmentJob.findFirst({
      where: { driverId: req.userId!, status: 'ACTIVE' },
      include: {
        shipment: {
          select: {
            id: true,
            originCity: true,
            destinationCity: true,
            originAddress: true,
            deliveryAddress: true,
            weightKg: true,
            packageSize: true,
            preferredDate: true,
            pickupContactName: true,
            pickupContactPhone: true,
            recipientDetails: true,
            notes: true,
            status: true,
          },
        },
        route: {
          select: {
            vehicleType: true,
            licensePlate: true,
            vehicleModel: true,
            vehicleColor: true,
          },
        },
      },
    })
    res.json({ job: job ?? null })
  } catch (err) {
    next(err)
  }
}

export async function markPickedUp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const job = await prisma.shipmentJob.findFirst({
      where: { driverId: req.userId!, status: 'ACTIVE' },
    })
    if (!job) throw new AppError('No tenés un trabajo activo', 404)
    if (job.pickedUpAt) throw new AppError('Ya marcaste que retiraste el paquete', 400)

    await prisma.$transaction([
      prisma.shipmentJob.update({
        where: { id: job.id },
        data: { pickedUpAt: new Date() },
      }),
      prisma.shipment.update({
        where: { id: job.shipmentId },
        data: { status: 'PICKED_UP' },
      }),
    ])
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function markDelivered(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const job = await prisma.shipmentJob.findFirst({
      where: { driverId: req.userId!, status: 'ACTIVE' },
    })
    if (!job) throw new AppError('No tenés un trabajo activo', 404)
    if (!job.pickedUpAt) throw new AppError('Primero marcá que retiraste el paquete', 400)
    if (job.deliveredAt) throw new AppError('Ya marcaste que entregaste el paquete', 400)

    await prisma.$transaction([
      prisma.shipmentJob.update({
        where: { id: job.id },
        data: { deliveredAt: new Date(), status: 'COMPLETED' },
      }),
      prisma.shipment.update({
        where: { id: job.shipmentId },
        data: { status: 'DELIVERED' },
      }),
    ])
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// Conductor ve sus envíos programados para fechas futuras
export async function getUpcomingForDriver(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const now = new Date()
    const shipments = await prisma.shipment.findMany({
      where: {
        status: 'SEARCHING',
        candidateDriverIds: { has: req.userId! },
        preferredDate: { gt: now },
      },
      orderBy: { preferredDate: 'asc' },
    })
    // Only expose shipments where this driver is first in queue
    const filtered = shipments
      .filter(s => s.candidateDriverIds[0] === req.userId)
      .slice(0, 20)
    res.json({ shipments: filtered })
  } catch (err) {
    next(err)
  }
}

// Conductor acepta o rechaza
export async function respondToShipment(req: AuthRequest<ShipmentParams>, res: Response, next: NextFunction) {
  try {
    const { action } = req.body as { action: 'accept' | 'reject' }

    if (action !== 'accept' && action !== 'reject') {
      throw new AppError('Acción inválida', 400)
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { sender: { select: { pushToken: true } } },
    })

    if (!shipment) throw new AppError('Pedido no encontrado', 404)
    if (shipment.status !== 'SEARCHING') throw new AppError('Este pedido ya no está disponible', 400)
    if (shipment.candidateDriverIds[0] !== req.userId) {
      throw new AppError('Este pedido no está esperando tu respuesta', 403)
    }

    if (action === 'accept') {
      const candidates = await findCandidateDrivers({
        originCity: shipment.originCity,
        destinationCity: shipment.destinationCity,
        weightKg: shipment.weightKg,
        preferredDate: shipment.preferredDate ?? undefined,
        senderId: shipment.senderId,
      })
      const matched = candidates.find(c => c.driverId === req.userId)
      if (!matched) throw new AppError('No coincidís con este pedido', 400)

      // Atomic accept: updateMany only succeeds if status is still SEARCHING,
      // preventing two concurrent accepts from creating duplicate jobs
      const job = await prisma.$transaction(async tx => {
        const claimed = await tx.shipment.updateMany({
          where: { id: shipment.id, status: 'SEARCHING' },
          data: { status: 'ASSIGNED' },
        })
        if (claimed.count === 0) {
          throw new AppError('Este pedido ya fue asignado a otro conductor', 409)
        }
        return tx.shipmentJob.create({
          data: {
            shipmentId: shipment.id,
            driverId: req.userId!,
            routeId: matched.routeId,
          },
        })
      })

      if (shipment.sender.pushToken) {
        await sendPushNotification({
          to: shipment.sender.pushToken,
          title: '¡Conductor asignado!',
          body: `Tu paquete a ${shipment.destinationCity} ya tiene conductor. Te va a contactar pronto.`,
          data: { shipmentId: shipment.id, type: 'shipment_accepted' },
        })
      }

      res.json({ job })
    } else {
      await advanceQueue(shipment.id)
      res.json({ message: 'Pedido rechazado' })
    }
  } catch (err) {
    next(err)
  }
}
