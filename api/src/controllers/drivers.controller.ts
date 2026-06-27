import { Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/authenticate'

// Stats del conductor a partir de sus ShipmentJob. Las "ganancias" son estimadas
// (peso x precio/kg, neto del fee de plataforma) porque todavia no hay pagos reales.
export async function getDriverStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const driverId = req.userId!
    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 12)

    const jobs = await prisma.shipmentJob.findMany({
      where: { driverId },
      select: {
        status: true,
        deliveredAt: true,
        shipment: { select: { weightKg: true } },
        route: { select: { pricePerKg: true } },
      },
    })

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    let completedTotal = 0
    let completedToday = 0
    let completedThisWeek = 0
    let activeCount = 0
    let earningsTotal = 0
    let earningsThisWeek = 0

    for (const job of jobs) {
      if (job.status === 'ACTIVE') activeCount++
      if (job.status !== 'COMPLETED') continue

      completedTotal++
      const gross = (job.shipment?.weightKg ?? 0) * (job.route?.pricePerKg ?? 0)
      const net = gross * (1 - feePercent / 100)
      earningsTotal += net

      if (job.deliveredAt) {
        if (job.deliveredAt >= startOfToday) completedToday++
        if (job.deliveredAt >= weekAgo) {
          completedThisWeek++
          earningsThisWeek += net
        }
      }
    }

    res.json({
      stats: {
        completedTotal,
        completedToday,
        completedThisWeek,
        activeCount,
        earningsTotal: Math.round(earningsTotal),
        earningsThisWeek: Math.round(earningsThisWeek),
        currency: 'ARS',
      },
    })
  } catch (err) {
    next(err)
  }
}
