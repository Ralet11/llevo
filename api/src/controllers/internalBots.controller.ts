import { NextFunction, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { internalBotsAvailable } from '../services/internalBots'

const preferencesSchema = z.object({
  rideEnabled: z.boolean(),
  shipmentEnabled: z.boolean(),
}).strict()

function response(user: { demoRideBotEnabled: boolean; demoShipmentBotEnabled: boolean }) {
  return {
    available: internalBotsAvailable(),
    rideEnabled: user.demoRideBotEnabled,
    shipmentEnabled: user.demoShipmentBotEnabled,
  }
}

export async function getInternalBotPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { demoRideBotEnabled: true, demoShipmentBotEnabled: true },
    })
    if (!user) throw new AppError('Usuario no encontrado', 404)
    res.json(response(user))
  } catch (error) { next(error) }
}

export async function updateInternalBotPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!internalBotsAvailable()) throw new AppError('Los bots internos no están disponibles', 503)
    const input = preferencesSchema.parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        demoRideBotEnabled: input.rideEnabled,
        demoShipmentBotEnabled: input.shipmentEnabled,
      },
      select: { demoRideBotEnabled: true, demoShipmentBotEnabled: true },
    })
    res.json(response(user))
  } catch (error) { next(error) }
}
