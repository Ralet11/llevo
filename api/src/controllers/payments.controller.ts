import { NextFunction, Request, Response } from 'express'
import { AuthRequest } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { serializable } from '../lib/transaction'
import { emitToUser } from '../lib/socket'
import { isDemoRideBotEmail, scheduleDemoRideCompletion } from '../services/demoRideBot'
import { DEMO_SHIPMENT_BOT_EMAIL, scheduleDemoShipmentLifecycle } from '../services/demoShipmentBot'

function requireInternalPayment() {
  if (process.env.INTERNAL_TESTING !== 'true') {
    throw new AppError('Los cobros están deshabilitados. Usá el entorno de pruebas internas.', 503)
  }
}

// No network call or movement of funds. authenticate enforces the tester allowlist.
export async function createRideCheckout(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    requireInternalPayment()
    const result = await serializable(async tx => {
      const booking = await tx.rideBooking.findFirst({
        where: { id: req.params.id, passengerId: req.userId! },
        include: { payment: true, route: { include: { driver: { select: { email: true } } } } },
      })
      if (!booking || !['APPROVED', 'PAID'].includes(booking.status) || booking.pricePerSeat == null) {
        throw new AppError('Esta reserva no está lista para confirmar', 409)
      }
      const amountCents = Math.round(booking.pricePerSeat * booking.seats * 100)
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new AppError('Precio inválido', 409)
      const payment = await tx.payment.upsert({
        where: { rideBookingId: booking.id },
        create: { userId: req.userId!, rideBookingId: booking.id, amount: amountCents / 100, netAmount: amountCents / 100,
          platformFee: 0, amountCents, netAmountCents: amountCents, platformFeeCents: 0,
          currency: 'ARS', status: 'IN_ESCROW', externalId: 'internal:' + booking.id },
        update: {},
      })
      if (payment.externalId !== 'internal:' + booking.id || payment.status !== 'IN_ESCROW') {
        throw new AppError('El pago no pertenece a esta prueba activa', 409)
      }
      await tx.rideBooking.update({ where: { id: booking.id }, data: { status: 'PAID' } })
      if (booking.travelRequestId) await tx.travelRequest.update({ where: { id: booking.travelRequestId }, data: { status: 'CONFIRMED' } })
      return { payment, booking }
    })
    for (const id of [req.userId!, result.booking.route.driverId]) emitToUser(id, 'ride:status_changed', { bookingId: result.booking.id, status: 'PAID' })
    if (isDemoRideBotEmail(result.booking.route.driver.email)) scheduleDemoRideCompletion(result.booking.id)
    res.json({ simulated: true, checkoutUrl: null, paymentId: result.payment.id })
  } catch (err) { next(err) }
}

export async function createShipmentCheckout(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    requireInternalPayment()
    const result = await serializable(async tx => {
      const job = await tx.shipmentJob.findFirst({
        where: { id: req.params.id, status: 'ACTIVE', shipment: { senderId: req.userId!, status: 'ASSIGNED' } },
        include: { driver: { select: { email: true } } },
      })
      if (!job || job.quotedTotal <= 0) throw new AppError('Este envío no está listo para confirmar', 409)
      const amountCents = Math.round(job.quotedTotal * 100)
      const platformFeeCents = Math.round(job.platformFee * 100)
      const payment = await tx.payment.upsert({
        where: { shipmentJobId: job.id },
        create: { userId: req.userId!, shipmentJobId: job.id, amount: amountCents / 100, platformFee: platformFeeCents / 100,
          netAmount: (amountCents - platformFeeCents) / 100, amountCents, platformFeeCents, netAmountCents: amountCents - platformFeeCents,
          currency: 'ARS', status: 'IN_ESCROW', externalId: 'internal:' + job.id },
        update: {},
      })
      if (payment.externalId !== 'internal:' + job.id || payment.status !== 'IN_ESCROW') throw new AppError('El pago no pertenece a esta prueba activa', 409)
      return { job, payment }
    })
    for (const id of [req.userId!, result.job.driverId]) emitToUser(id, 'shipment:payment_changed', { shipmentId: result.job.shipmentId, status: 'PAID' })
    if (result.job.driver.email === DEMO_SHIPMENT_BOT_EMAIL) scheduleDemoShipmentLifecycle(result.job.id)
    res.json({ simulated: true, checkoutUrl: null, paymentId: result.payment.id })
  } catch (err) { next(err) }
}

export function mercadoPagoWebhook(_req: Request, res: Response) {
  res.status(503).json({ error: 'Los cobros externos están deshabilitados en el MVP interno' })
}
