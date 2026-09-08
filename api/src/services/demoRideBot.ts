import prisma from '../lib/prisma'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from './notifications'
import type { PassengerTripOption } from '../lib/matching'
import { internalBotsAvailable, testerWantsBot } from './internalBots'
import { serializable } from '../lib/transaction'

const DEMO_RIDE_BOT_NAME = 'Conductor de prueba'
const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const approvalTimers = new Map<string, NodeJS.Timeout>()
const completionTimers = new Map<string, NodeJS.Timeout>()

function demoRideBotEmail(ownerId: string) {
  return `demo-ride-${ownerId}@llevo.invalid`
}

export function isDemoRideBotEmail(email: string | null | undefined) {
  return Boolean(email?.startsWith('demo-ride-') && email.endsWith('@llevo.invalid'))
}

function config() {
  const approval = Number(process.env.DEMO_RIDE_BOT_APPROVAL_DELAY_MS ?? 8_000)
  const completion = Number(process.env.DEMO_RIDE_BOT_COMPLETION_DELAY_MS ?? 30_000)
  return {
    enabled: internalBotsAvailable(),
    approvalDelayMs: Number.isFinite(approval) ? Math.max(1_000, Math.min(Math.round(approval), 10 * 60 * 1000)) : 8_000,
    completionDelayMs: Number.isFinite(completion) ? Math.max(1_000, Math.min(Math.round(completion), 30 * 60 * 1000)) : 30_000,
    pricePerSeat: Math.max(0, Number(process.env.DEMO_RIDE_BOT_PRICE_PER_SEAT ?? 1_000) || 1_000),
  }
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(date)
}

export async function createDemoRideOption(input: { passengerId: string; originCity: string; destinationCity: string; date: Date }): Promise<PassengerTripOption | null> {
  if (!await testerWantsBot(input.passengerId, 'ride')) return null

  const c = config()
  const botEmail = demoRideBotEmail(input.passengerId)
  const driver = await prisma.user.upsert({
    where: { email: botEmail },
    create: { email: botEmail, name: DEMO_RIDE_BOT_NAME, isDemoBot: true, isVerified: true, driverVerificationStatus: 'APPROVED', driverVerifiedAt: new Date(), rating: 5, ratingCount: 1 },
    update: { name: DEMO_RIDE_BOT_NAME, isDemoBot: true, isActive: true },
  })
  let route = await prisma.driverRoute.findFirst({
    where: { driverId: driver.id, kind: 'INTERCITY', originCity: input.originCity, destinationCity: input.destinationCity, carriesPassengers: true, isActive: true },
    include: { vehicle: { select: { type: true, model: true, seats: true } } },
  })
  if (!route) {
    route = await prisma.driverRoute.create({
      data: {
        driverId: driver.id, kind: 'INTERCITY', originCity: input.originCity, destinationCity: input.destinationCity,
        daysOfWeek: [...ALL_DAYS], departureTimeFrom: '10:00', departureTimeTo: '12:00',
        vehicleType: 'AUTO', vehicleModel: 'Vehículo de demostración', maxWeightKg: 1000,
        carriesPassengers: true, seatsOffered: 4, pricePerSeat: c.pricePerSeat, isActive: true,
      },
      include: { vehicle: { select: { type: true, model: true, seats: true } } },
    })
  }
  const held = await prisma.rideBooking.aggregate({ where: { routeId: route.id, date: dateKey(input.date), status: { in: ['APPROVED', 'PAID'] } }, _sum: { seats: true } })
  const seatsOffered = route.seatsOffered ?? 0
  const seatsFree = Math.max(0, seatsOffered - (held._sum.seats ?? 0))
  if (!seatsFree) return null
  return {
    routeId: route.id, date: dateKey(input.date), originCity: route.originCity, destinationCity: route.destinationCity,
    waypointCities: route.waypointCities, departureTimeFrom: route.departureTimeFrom, departureTimeTo: route.departureTimeTo,
    pricePerSeat: route.pricePerSeat, seatsOffered, seatsFree,
    driver: { id: driver.id, name: DEMO_RIDE_BOT_NAME, avatarUrl: null, rating: 5, ratingCount: 1, isIdentityVerified: true, isDemo: true },
    vehicle: route.vehicle ? { type: route.vehicle.type, model: route.vehicle.model, seats: route.vehicle.seats } : null,
  }
}

export function scheduleDemoRideApproval(bookingId: string) {
  const c = config()
  if (!c.enabled || approvalTimers.has(bookingId)) return
  approvalTimers.set(bookingId, setTimeout(() => {
    approvalTimers.delete(bookingId)
    void approveDemoBooking(bookingId).catch(error => console.error('[demo-ride-bot] Error aprobando reserva:', error))
  }, c.approvalDelayMs))
}

async function approveDemoBooking(bookingId: string) {
  const booking = await prisma.rideBooking.findUnique({
    where: { id: bookingId },
    include: { route: { select: { driver: { select: { email: true } }, seatsOffered: true, originCity: true, destinationCity: true } }, passenger: { select: { pushToken: true } } },
  })
  if (!booking || booking.status !== 'PENDING' || !isDemoRideBotEmail(booking.route.driver.email) || !config().enabled) return false
  const updated = await prisma.$transaction(async tx => {
    const held = await tx.rideBooking.aggregate({ where: { routeId: booking.routeId, date: booking.date, status: { in: ['APPROVED', 'PAID'] } }, _sum: { seats: true } })
    if ((booking.route.seatsOffered ?? 0) - (held._sum.seats ?? 0) < booking.seats) return false
    const changed = await tx.rideBooking.updateMany({ where: { id: booking.id, status: 'PENDING' }, data: { status: 'APPROVED' } })
    return changed.count === 1
  })
  if (!updated) return false
  emitToUser(booking.passengerId, 'ride:status_changed', { bookingId: booking.id, status: 'APPROVED', demo: true })
  if (booking.passenger.pushToken) await sendPushNotification({ to: booking.passenger.pushToken, title: 'Viaje de prueba aprobado', body: `Ya podés pagar tu lugar en ${booking.route.originCity} → ${booking.route.destinationCity}.`, data: { bookingId: booking.id, type: 'ride_approved', demo: 'true' } })
  console.log(`[demo-ride-bot] Reserva demo aprobada: ${booking.id}`)
  return true
}

export function scheduleDemoRideCompletion(bookingId: string) {
  const c = config()
  if (!c.enabled || completionTimers.has(bookingId)) return
  completionTimers.set(bookingId, setTimeout(() => {
    completionTimers.delete(bookingId)
    void runDemoRideCompletion(bookingId).catch(error => console.error('[demo-ride-bot] Error completando reserva:', error))
  }, c.completionDelayMs))
}

export async function runDemoRideCompletion(bookingId: string) {
  if (!config().enabled) return false
  const result = await serializable(async tx => {
    const booking = await tx.rideBooking.findUnique({
      where: { id: bookingId },
      include: { route: { select: { driver: { select: { email: true } } } }, payment: true },
    })
    if (!booking || !isDemoRideBotEmail(booking.route.driver.email) || booking.status !== 'PAID' || booking.payment?.status !== 'IN_ESCROW') return null
    const moved = await tx.rideBooking.updateMany({ where: { id: booking.id, status: 'PAID' }, data: { status: 'COMPLETED' } })
    if (moved.count === 0) return null
    await tx.payment.update({ where: { id: booking.payment.id }, data: { status: 'RELEASED' } })
    if (booking.travelRequestId) await tx.travelRequest.update({ where: { id: booking.travelRequestId }, data: { status: 'COMPLETED' } })
    return booking
  })
  if (!result) return false
  emitToUser(result.passengerId, 'ride:status_changed', { bookingId: result.id, status: 'COMPLETED', demo: true })
  return true
}

export async function reconcileDemoRideBot() {
  if (!config().enabled) return
  const pending = await prisma.rideBooking.findMany({ where: { status: 'PENDING', route: { driver: { isDemoBot: true, email: { startsWith: 'demo-ride-' } } } }, select: { id: true }, take: 100 })
  pending.forEach(booking => scheduleDemoRideApproval(booking.id))
  const paid = await prisma.rideBooking.findMany({ where: { status: 'PAID', route: { driver: { isDemoBot: true, email: { startsWith: 'demo-ride-' } } }, payment: { status: 'IN_ESCROW' } }, select: { id: true }, take: 100 })
  paid.forEach(booking => scheduleDemoRideCompletion(booking.id))
}
