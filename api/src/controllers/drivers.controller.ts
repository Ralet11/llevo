import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/authenticate'

// Clave local YYYY-MM-DD (no UTC, para no correr el dia en timezones negativos).
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

    // Ultimos 7 dias calendario (hoy incluido), para el grafico de tendencia.
    const dailyEarningsMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - i)
      dailyEarningsMap.set(dayKey(d), 0)
    }

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

        const key = dayKey(job.deliveredAt)
        if (dailyEarningsMap.has(key)) {
          dailyEarningsMap.set(key, dailyEarningsMap.get(key)! + net)
        }
      }
    }

    const dailyEarnings = Array.from(dailyEarningsMap.entries()).map(([date, amount]) => ({
      date,
      amount: Math.round(amount),
    }))

    res.json({
      stats: {
        completedTotal,
        completedToday,
        completedThisWeek,
        activeCount,
        earningsTotal: Math.round(earningsTotal),
        earningsThisWeek: Math.round(earningsThisWeek),
        currency: 'ARS',
        dailyEarnings,
      },
    })
  } catch (err) {
    next(err)
  }
}

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')

// Dias que el conductor marco como "no disponible": no se lo tiene en cuenta para
// viajes INTERCITY programados esos dias (LOCAL no usa esto, se resuelve con online/offline).
export async function getMyDaysOff(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const daysOff = await prisma.driverDayOff.findMany({
      where: { driverId: req.userId! },
      select: { date: true },
      orderBy: { date: 'asc' },
    })
    res.json({ dates: daysOff.map(d => d.date) })
  } catch (err) {
    next(err)
  }
}

export async function addDayOff(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const date = dateKeySchema.parse(req.body.date)
    await prisma.driverDayOff.upsert({
      where: { driverId_date: { driverId: req.userId!, date } },
      create: { driverId: req.userId!, date },
      update: {},
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function removeDayOff(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const date = dateKeySchema.parse(req.params.date)
    await prisma.driverDayOff.deleteMany({ where: { driverId: req.userId!, date } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
