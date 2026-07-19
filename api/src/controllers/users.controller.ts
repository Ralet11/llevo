import { Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'

type UserParams = { id: string }

// Perfil público de un usuario, visible por otros (conductor <-> remitente).
// NO expone datos de contacto (email/phone): eso solo se comparte cuando hay un
// job asignado, via el detalle del pedido. Sirve tanto para el perfil del
// conductor como el del remitente; el front decide qué destacar según el rol.
export async function getUserProfile(req: AuthRequest<UserParams>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        rating: true,
        ratingCount: true,
        createdAt: true,
        phoneVerifiedAt: true,
        driverVerifiedAt: true,
        driverVerificationStatus: true,
      },
    })

    if (!user) throw new AppError('Usuario no encontrado', 404)

    // Stats en paralelo: entregas hechas como conductor y envíos enviados como remitente.
    const [deliveries, shipments, reviews] = await Promise.all([
      prisma.shipmentJob.count({ where: { driverId: id, status: 'COMPLETED' } }),
      prisma.shipment.count({ where: { senderId: id, status: 'DELIVERED' } }),
      prisma.review.findMany({
        where: { toId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          from: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
    ])

    res.json({
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        rating: user.rating,
        ratingCount: user.ratingCount,
        createdAt: user.createdAt,
        isIdentityVerified: user.driverVerifiedAt != null || user.driverVerificationStatus === 'APPROVED',
        isPhoneVerified: user.phoneVerifiedAt != null,
        stats: { deliveries, shipments },
        reviews,
      },
    })
  } catch (err) {
    next(err)
  }
}
