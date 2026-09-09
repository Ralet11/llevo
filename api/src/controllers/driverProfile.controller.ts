import { NextFunction, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'

const ONBOARDING_VERSION = 1
const driverModeSchema = z.enum(['rider', 'viajes', 'entrega'])
const profileSchema = z.object({
  mode: driverModeSchema,
  city: z.string().trim().max(120).default(''),
  vehicle: z.string().trim().max(160).default(''),
  coverage: z.string().trim().max(240).default(''),
  availability: z.string().trim().max(240).default(''),
  notes: z.string().trim().max(1000).default(''),
  onboardingCompleted: z.boolean(),
  onboardingVersion: z.number().int().positive().default(ONBOARDING_VERSION),
  primaryRouteId: z.string().trim().min(1).nullable().optional(),
})

export async function getMyDriverProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.userId! } })
    res.json({ profile })
  } catch (error) {
    next(error)
  }
}

export async function saveMyDriverProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = profileSchema.parse(req.body)
    let primaryRouteId = data.primaryRouteId ?? null

    if (primaryRouteId) {
      const route = await prisma.driverRoute.findFirst({ where: { id: primaryRouteId, driverId: req.userId! }, select: { id: true } })
      if (!route) throw new AppError('La ruta principal no pertenece al conductor', 400)
    } else if (data.mode === 'entrega') {
      // Migra perfiles que antes vivian solo en el telefono enlazandolos con su
      // ruta mas reciente. Asi, repetir el wizard actualiza y no duplica rutas.
      const latestRoute = await prisma.driverRoute.findFirst({
        where: { driverId: req.userId! },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      primaryRouteId = latestRoute?.id ?? null
    }

    const completedAt = data.onboardingCompleted ? new Date() : null
    const profile = await prisma.driverProfile.upsert({
      where: { userId: req.userId! },
      create: { ...data, primaryRouteId, completedAt, userId: req.userId! },
      update: { ...data, primaryRouteId, completedAt },
    })
    res.json({ profile })
  } catch (error) {
    next(error)
  }
}

export async function resetMyDriverOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (process.env.INTERNAL_TESTING !== 'true') {
      throw new AppError('El reinicio del wizard solo esta disponible en pruebas internas', 404)
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true } })
    const testerEmails = (process.env.INTERNAL_TESTER_EMAILS ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
    if (!user?.email || !testerEmails.includes(user.email.toLowerCase())) {
      throw new AppError('Cuenta no autorizada para controles de prueba', 403)
    }

    const existing = await prisma.driverProfile.findUnique({ where: { userId: req.userId! } })
    const profile = existing
      ? await prisma.driverProfile.update({
          where: { userId: req.userId! },
          data: { onboardingCompleted: false, completedAt: null },
        })
      : null

    res.json({ profile })
  } catch (error) {
    next(error)
  }
}
