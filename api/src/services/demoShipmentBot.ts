import prisma from '../lib/prisma'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from './notifications'
import { quoteShipment } from './shipmentPricing'
import { internalBotsAvailable, testerWantsBot } from './internalBots'

export const DEMO_SHIPMENT_BOT_EMAIL = 'demo-shipment-driver@llevo.invalid'
const DEMO_DRIVER_NAME = 'Conductor de prueba'
const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const

const acceptTimers = new Map<string, NodeJS.Timeout>()
const pickupTimers = new Map<string, NodeJS.Timeout>()
const deliveryTimers = new Map<string, NodeJS.Timeout>()

type DemoBotConfig = {
  enabled: boolean
  acceptDelayMs: number
  pickupDelayMs: number
  deliveryDelayMs: number
}

function delay(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback)
  return Number.isFinite(value) ? Math.max(1_000, Math.min(Math.round(value), 30 * 60 * 1000)) : fallback
}

function getConfig(): DemoBotConfig {
  return {
    enabled: internalBotsAvailable(),
    acceptDelayMs: delay('DEMO_SHIPMENT_BOT_ACCEPT_DELAY_MS', 8_000),
    pickupDelayMs: delay('DEMO_SHIPMENT_BOT_PICKUP_DELAY_MS', 25_000),
    deliveryDelayMs: delay('DEMO_SHIPMENT_BOT_DELIVERY_DELAY_MS', 45_000),
  }
}

// Solo se usa durante demostraciones controladas. Nunca marca un pago como
// aprobado: simplemente permite que el conductor ficticio recorra el flujo.
function canAdvanceLifecycle(paymentStatus: string | undefined) {
  return paymentStatus === 'IN_ESCROW'
}

export function shouldUseDemoShipmentBot(userId: string) {
  return testerWantsBot(userId, 'shipment')
}

function isLocal(originCity: string, destinationCity: string) {
  return originCity.trim().toLocaleLowerCase('es-AR') === destinationCity.trim().toLocaleLowerCase('es-AR')
}

function schedule(map: Map<string, NodeJS.Timeout>, key: string, waitMs: number, task: () => Promise<void>) {
  if (map.has(key)) return
  const timer = setTimeout(() => {
    map.delete(key)
    void task().catch(error => console.error('[demo-shipment-bot] Error en tarea programada:', error))
  }, waitMs)
  map.set(key, timer)
}

export function scheduleDemoShipmentAcceptance(shipmentId: string) {
  const config = getConfig()
  if (!config.enabled) return
  schedule(acceptTimers, shipmentId, config.acceptDelayMs, async () => {
    await acceptWithDemoDriver(shipmentId)
  })
}

async function acceptWithDemoDriver(shipmentId: string) {
  const config = getConfig()
  if (!config.enabled) return false

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { sender: { select: { email: true, pushToken: true } } },
  })
  if (!shipment || !shipment.isDemo || shipment.status !== 'SEARCHING' || shipment.candidateDriverIds.length > 0) {
    return false
  }

  const quote = quoteShipment({
    distanceKm: shipment.estimatedDistanceKm,
    durationMin: shipment.estimatedDurationMin,
    weightKg: shipment.weightKg,
    packageSize: shipment.packageSize,
  })

  const accepted = await prisma.$transaction(async tx => {
    const claimed = await tx.shipment.updateMany({
      where: { id: shipment.id, status: 'SEARCHING', candidateDriverIds: { isEmpty: true } },
      data: { status: 'ASSIGNED' },
    })
    if (claimed.count === 0) return null

    const driver = await tx.user.upsert({
      where: { email: DEMO_SHIPMENT_BOT_EMAIL },
      create: {
        email: DEMO_SHIPMENT_BOT_EMAIL,
        name: DEMO_DRIVER_NAME,
        isDemoBot: true,
        isVerified: true,
        driverVerificationStatus: 'APPROVED',
        driverVerifiedAt: new Date(),
        rating: 5,
        ratingCount: 1,
      },
      update: { name: DEMO_DRIVER_NAME, isDemoBot: true, isActive: true },
    })
    const route = await tx.driverRoute.create({
      data: {
        driverId: driver.id,
        kind: isLocal(shipment.originCity, shipment.destinationCity) ? 'LOCAL' : 'INTERCITY',
        originCity: shipment.originCity,
        destinationCity: shipment.destinationCity,
        daysOfWeek: [...DAYS_OF_WEEK],
        vehicleType: 'AUTO',
        vehicleModel: 'Vehículo de demostración',
        maxWeightKg: Math.max(1000, shipment.weightKg),
        isActive: false,
      },
    })
    const job = await tx.shipmentJob.create({
      data: {
        shipmentId: shipment.id,
        driverId: driver.id,
        routeId: route.id,
        baseFee: quote.baseFee,
        distanceFee: quote.distanceFee,
        timeFee: quote.timeFee,
        weightFee: quote.weightFee,
        sizeSurcharge: quote.sizeSurcharge,
        platformFee: quote.platformFee,
        quotedTotal: quote.total,
      },
    })
    return { job, driver }
  })
  if (!accepted) return false

  emitToUser(shipment.senderId, 'shipment:status_changed', {
    shipmentId: shipment.id,
    status: 'ASSIGNED',
    driver: { id: accepted.driver.id, name: DEMO_DRIVER_NAME, phone: null, rating: 5, ratingCount: 1, demo: true },
  })
  if (shipment.sender.pushToken) {
    await sendPushNotification({
      to: shipment.sender.pushToken,
      title: 'Conductor de prueba asignado',
      body: 'Tu envío de demostración está listo para continuar con el pago de prueba.',
      data: { shipmentId: shipment.id, type: 'shipment_accepted', demo: 'true' },
    })
  }
  console.log(`[demo-shipment-bot] Envío demo asignado: ${shipment.id}`)
  return true
}

export function scheduleDemoShipmentLifecycle(jobId: string) {
  const config = getConfig()
  if (!config.enabled) return
  schedule(pickupTimers, jobId, config.pickupDelayMs, async () => {
    if (await runDemoShipmentPickup(jobId)) scheduleDemoShipmentDelivery(jobId)
  })
}

function scheduleDemoShipmentDelivery(jobId: string) {
  const config = getConfig()
  if (!config.enabled) return
  schedule(deliveryTimers, jobId, config.deliveryDelayMs, async () => {
    await runDemoShipmentDelivery(jobId)
  })
}

async function getDemoJob(jobId: string) {
  return prisma.shipmentJob.findUnique({
    where: { id: jobId },
    include: {
      driver: { select: { email: true } },
      payment: { select: { id: true, status: true } },
      shipment: { include: { sender: { select: { pushToken: true } } } },
    },
  })
}

export async function runDemoShipmentPickup(jobId: string) {
  if (!internalBotsAvailable()) return false
  const job = await getDemoJob(jobId)
  if (!job || job.driver.email !== DEMO_SHIPMENT_BOT_EMAIL || !canAdvanceLifecycle(job.payment?.status) || job.shipment.status !== 'ASSIGNED' || job.pickedUpAt) return false

  const updated = await prisma.$transaction(async tx => {
    const moved = await tx.shipment.updateMany({ where: { id: job.shipmentId, status: 'ASSIGNED' }, data: { status: 'PICKED_UP' } })
    if (moved.count === 0) return false
    await tx.shipmentJob.update({ where: { id: job.id }, data: { pickedUpAt: new Date() } })
    return true
  })
  if (!updated) return false

  emitToUser(job.shipment.senderId, 'shipment:status_changed', { shipmentId: job.shipmentId, status: 'PICKED_UP', demo: true })
  if (job.shipment.sender.pushToken) {
    await sendPushNotification({
      to: job.shipment.sender.pushToken,
      title: 'Retiro simulado',
      body: `El conductor de prueba retiró tu paquete rumbo a ${job.shipment.destinationCity}.`,
      data: { shipmentId: job.shipmentId, type: 'shipment_picked_up', demo: 'true' },
    })
  }
  return true
}

export async function runDemoShipmentDelivery(jobId: string) {
  if (!internalBotsAvailable()) return false
  const job = await getDemoJob(jobId)
  if (!job || job.driver.email !== DEMO_SHIPMENT_BOT_EMAIL || !canAdvanceLifecycle(job.payment?.status) || job.shipment.status !== 'PICKED_UP' || job.deliveredAt) return false

  const updated = await prisma.$transaction(async tx => {
    const moved = await tx.shipment.updateMany({ where: { id: job.shipmentId, status: 'PICKED_UP' }, data: { status: 'DELIVERED' } })
    if (moved.count === 0) return false
    await tx.shipmentJob.update({ where: { id: job.id }, data: { deliveredAt: new Date(), status: 'COMPLETED' } })
    if (job.payment) await tx.payment.update({ where: { id: job.payment.id }, data: { status: 'RELEASED' } })
    return true
  })
  if (!updated) return false

  emitToUser(job.shipment.senderId, 'shipment:status_changed', { shipmentId: job.shipmentId, status: 'DELIVERED', demo: true })
  if (job.shipment.sender.pushToken) {
    await sendPushNotification({
      to: job.shipment.sender.pushToken,
      title: 'Entrega simulada completada',
      body: 'El conductor de prueba marcó tu envío como entregado.',
      data: { shipmentId: job.shipmentId, type: 'shipment_delivered', demo: 'true' },
    })
  }
  return true
}

export async function reconcileDemoShipmentBot() {
  const config = getConfig()
  if (!config.enabled) return

  const waiting = await prisma.shipment.findMany({
    where: { isDemo: true, status: 'SEARCHING', candidateDriverIds: { isEmpty: true } },
    select: { id: true },
    take: 100,
  })
  for (const shipment of waiting) scheduleDemoShipmentAcceptance(shipment.id)

  const demoJobs = await prisma.shipmentJob.findMany({
    where: {
      status: 'ACTIVE',
      driver: { email: DEMO_SHIPMENT_BOT_EMAIL },
    },
    include: { shipment: { select: { status: true } }, payment: { select: { status: true } } },
    take: 100,
  })
  for (const job of demoJobs) {
    if (!canAdvanceLifecycle(job.payment?.status)) continue
    if (job.shipment.status === 'ASSIGNED') scheduleDemoShipmentLifecycle(job.id)
    if (job.shipment.status === 'PICKED_UP') scheduleDemoShipmentDelivery(job.id)
  }
}
