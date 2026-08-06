import prisma from '../lib/prisma'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from './notifications'
import type { PassengerTripOption } from '../lib/matching'

export const DEMO_RIDE_BOT_EMAIL = 'demo-ride-driver@llevo.invalid'
const DEMO_RIDE_BOT_NAME = 'Conductor de prueba'
const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const approvalTimers = new Map<string, NodeJS.Timeout>()

function isTrue(value?: string) { return value?.trim().toLowerCase() === 'true' }

function config() {
  const enabled = process.env.DEMO_RIDE_BOT_ENABLED ?? process.env.DEMO_SHIPMENT_BOT_ENABLED
  const allowAllUsers = process.env.DEMO_RIDE_BOT_ALLOW_ALL_USERS ?? process.env.DEMO_SHIPMENT_BOT_ALLOW_ALL_USERS
  const value = Number(process.env.DEMO_RIDE_BOT_APPROVAL_DELAY_MS ?? 8_000)
  return {
    enabled: isTrue(enabled),
    allowAllUsers: isTrue(allowAllUsers),
    allowedEmails: new Set((process.env.DEMO_RIDE_BOT_ALLOWED_EMAILS ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)),
    allowedUserIds: new Set((process.env.DEMO_RIDE_BOT_ALLOWED_USER_IDS ?? '').split(',').map(x => x.trim()).filter(Boolean)),
    approvalDelayMs: Number.isFinite(value) ? Math.max(1_000, Math.min(Math.round(value), 10 * 60 * 1000)) : 8_000,
    pricePerSeat: Math.max(0, Number(process.env.DEMO_RIDE_BOT_PRICE_PER_SEAT ?? 1_000) || 1_000),
  }
}

function allowed(userId: string, email: string | null | undefined) {
  const c = config()
  return c.enabled && (c.allowAllUsers || c.allowedUserIds.has(userId) || (!!email && c.allowedEmails.has(email.trim().toLowerCase())))
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(date)
}

export async function createDemoRideOption(input: { passengerId: string; originCity: string; destinationCity: string; date: Date }): Promise<PassengerTripOption | null> {
  const passenger = await prisma.user.findUnique({ where: { id: input.passengerId }, select: { email: true } })
  if (!allowed(input.passengerId, passenger?.email)) return null

  const c = config()
  const driver = await prisma.user.upsert({
    where: { email: DEMO_RIDE_BOT_EMAIL },
    create: { email: DEMO_RIDE_BOT_EMAIL, name: DEMO_RIDE_BOT_NAME, isVerified: true, driverVerificationStatus: 'APPROVED', driverVerifiedAt: new Date(), rating: 5, ratingCount: 1 },
    update: { name: DEMO_RIDE_BOT_NAME, isActive: true },
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
  if (!booking || booking.status !== 'PENDING' || booking.route.driver.email !== DEMO_RIDE_BOT_EMAIL || !config().enabled) return false
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

export async function reconcileDemoRideBot() {
  if (!config().enabled) return
  const pending = await prisma.rideBooking.findMany({ where: { status: 'PENDING', route: { driver: { email: DEMO_RIDE_BOT_EMAIL } } }, select: { id: true }, take: 100 })
  pending.forEach(booking => scheduleDemoRideApproval(booking.id))
}
