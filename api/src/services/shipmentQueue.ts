import prisma from '../lib/prisma'
import { sendPushNotification } from './notifications'

const OFFER_TIMEOUT_MS = 15 * 60 * 1000

export async function notifyNextCandidate(shipmentId: string): Promise<void> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { sender: { select: { pushToken: true } } },
  })

  if (!shipment || shipment.status !== 'SEARCHING') return

  if (shipment.candidateDriverIds.length === 0) {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'NO_COVERAGE' },
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

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { lastNotifiedAt: new Date() },
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

export async function advanceQueue(shipmentId: string): Promise<void> {
  // Use a transaction to atomically read + pop the first candidate, preventing
  // duplicate advances if two concurrent rejects or timeouts race each other
  const updated = await prisma.$transaction(async tx => {
    const s = await tx.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true, candidateDriverIds: true },
    })
    if (!s || s.status !== 'SEARCHING') return null
    return tx.shipment.update({
      where: { id: shipmentId },
      data: { candidateDriverIds: s.candidateDriverIds.slice(1) },
    })
  })

  if (updated) await notifyNextCandidate(shipmentId)
}

export async function checkTimeouts(): Promise<void> {
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
      await advanceQueue(shipment.id)
    }
  }
}
