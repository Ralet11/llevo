import prisma from '../lib/prisma'
import { emitToUser } from '../lib/socket'
import { sendPushNotification } from './notifications'
import { serializable } from '../lib/transaction'

const OFFER_TIMEOUT_MS = 15 * 60 * 1000

export async function notifyNextCandidate(shipmentId: string): Promise<void> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { sender: { select: { pushToken: true } } },
  })

  if (!shipment || shipment.status !== 'SEARCHING') return

  if (shipment.candidateDriverIds.length === 0) {
    const claimed = await prisma.shipment.updateMany({
      where: { id: shipmentId, status: 'SEARCHING', candidateDriverIds: { equals: [] } },
      data: { status: 'NO_COVERAGE' },
    })
    if (!claimed.count) return

    emitToUser(shipment.senderId, 'shipment:status_changed', {
      shipmentId,
      status: 'NO_COVERAGE',
    })

    if (shipment.sender.pushToken) {
      await sendPushNotification({
        to: shipment.sender.pushToken,
        title: 'Sin cobertura disponible',
        body: `No encontramos conductores para ${shipment.originCity} → ${shipment.destinationCity} por ahora.`,
        data: { shipmentId, type: 'no_coverage' },
      })
    }
    return
  }

  const nextDriverId = shipment.candidateDriverIds[0]
  const driver = await prisma.user.findUnique({
    where: { id: nextDriverId },
    select: { pushToken: true },
  })

  const claimed = await prisma.shipment.updateMany({
    where: { id: shipmentId, status: 'SEARCHING', candidateDriverIds: { equals: shipment.candidateDriverIds }, lastNotifiedAt: shipment.lastNotifiedAt },
    data: { lastNotifiedAt: new Date() },
  })
  if (!claimed.count) return

  // Socket: el conductor recibe la oferta en tiempo real
  emitToUser(nextDriverId, 'shipment:new_offer', {
    shipmentId: shipment.id,
    shipment: {
      id: shipment.id,
      originCity: shipment.originCity,
      destinationCity: shipment.destinationCity,
      weightKg: shipment.weightKg,
      packageSize: shipment.packageSize,
      preferredDate: shipment.preferredDate,
      status: shipment.status,
    },
  })

  if (driver?.pushToken) {
    await sendPushNotification({
      to: driver.pushToken,
      title: 'Nuevo pedido en tu ruta',
      body: `Paquete ${shipment.weightKg}kg de ${shipment.originCity} a ${shipment.destinationCity}. Tenés 15 minutos para aceptarlo.`,
      data: { shipmentId, type: 'new_shipment' },
    })
  }
}

export async function advanceQueue(shipmentId: string, expectedDriverId?: string): Promise<void> {
  // Use a transaction to atomically read + pop the first candidate, preventing
  // duplicate advances if two concurrent rejects or timeouts race each other
  const updated = await serializable(async tx => {
    const s = await tx.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true, candidateDriverIds: true },
    })
    if (!s || s.status !== 'SEARCHING' || (expectedDriverId && s.candidateDriverIds[0] !== expectedDriverId)) return null
    return tx.shipment.update({
      where: { id: shipmentId },
      data: { candidateDriverIds: s.candidateDriverIds.slice(1), lastNotifiedAt: null },
    })
  })

  if (updated) await notifyNextCandidate(shipmentId)
}

export async function checkTimeouts(): Promise<void> {
  // Recover a crash before the first offer, or before notifying the next candidate.
  const waiting = await prisma.shipment.findMany({
    where: { status: 'SEARCHING', lastNotifiedAt: null, OR: [{ preferredDate: null }, { preferredDate: { lte: new Date(Date.now() + 3 * 60 * 60 * 1000) } }] },
    select: { id: true }, take: 100,
  })
  for (const shipment of waiting) await notifyNextCandidate(shipment.id)
  const cutoff = new Date(Date.now() - OFFER_TIMEOUT_MS)
  const timedOut = await prisma.shipment.findMany({
    where: {
      status: 'SEARCHING',
      lastNotifiedAt: { lt: cutoff },
    },
    select: { id: true, candidateDriverIds: true },
  })

  for (const shipment of timedOut) {
    if (shipment.candidateDriverIds.length > 0) {
      console.log(`[queue] Timeout en shipment ${shipment.id}, avanzando cola`)
      await advanceQueue(shipment.id, shipment.candidateDriverIds[0])
    }
  }
}
