import prisma from '../lib/prisma'

export type InternalBotKind = 'ride' | 'shipment'

function enabled(value?: string) {
  return value?.trim().toLowerCase() === 'true'
}

export function internalBotsAvailable() {
  return enabled(process.env.INTERNAL_TESTING) && enabled(process.env.INTERNAL_BOTS_AVAILABLE)
}

function testerEmails() {
  return new Set(
    (process.env.INTERNAL_TESTER_EMAILS ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

export async function testerWantsBot(userId: string, kind: InternalBotKind) {
  if (!internalBotsAvailable()) return false
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      isActive: true,
      demoRideBotEnabled: true,
      demoShipmentBotEnabled: true,
    },
  })
  if (!user?.isActive || !user.email || !testerEmails().has(user.email.trim().toLowerCase())) return false
  return kind === 'ride' ? user.demoRideBotEnabled : user.demoShipmentBotEnabled
}
