import { createHmac, timingSafeEqual } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { emitToUser } from '../lib/socket'

function paymentConfig() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  const webhookUrl = process.env.MP_WEBHOOK_URL
  if (!accessToken || !webhookUrl) throw new AppError('Los pagos todavía no están configurados', 503)
  return { accessToken, webhookUrl }
}

export async function createRideCheckout(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { accessToken, webhookUrl } = paymentConfig()
    const booking = await prisma.rideBooking.findFirst({
      where: { id: req.params.id, passengerId: req.userId!, status: 'APPROVED' },
      include: { passenger: { select: { name: true, email: true } }, payment: true },
    })
    if (!booking || booking.pricePerSeat == null) throw new AppError('Esta reserva no está lista para pagar', 409)

    const amount = booking.pricePerSeat * booking.seats
    const amountCents = Math.round(amount * 100)
    const payment = booking.payment ?? await prisma.payment.create({
      data: { amount, platformFee: 0, netAmount: amount, amountCents, platformFeeCents: 0, netAmountCents: amountCents, currency: 'ARS', userId: req.userId!, rideBookingId: booking.id },
    })
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_reference: payment.id,
        notification_url: webhookUrl,
        items: [{ id: booking.id, title: `Viaje ${booking.originCity} a ${booking.destinationCity}`, quantity: 1, currency_id: 'ARS', unit_price: amount }],
        payer: booking.passenger.email ? { email: booking.passenger.email, name: booking.passenger.name } : undefined,
      }),
    })
    const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string; message?: string }
    if (!response.ok || !data.id || !(data.sandbox_init_point || data.init_point)) throw new AppError(data.message || 'No se pudo iniciar el pago', 502)
    await prisma.payment.update({ where: { id: payment.id }, data: { providerPreferenceId: data.id, externalId: data.id } })
    res.json({ checkoutUrl: data.sandbox_init_point ?? data.init_point, paymentId: payment.id })
  } catch (err) { next(err) }
}

export async function createShipmentCheckout(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { accessToken, webhookUrl } = paymentConfig()
    const job = await prisma.shipmentJob.findFirst({
      where: { id: req.params.id, status: 'ACTIVE', shipment: { senderId: req.userId!, status: 'ASSIGNED' } },
      include: {
        shipment: { select: { senderId: true, originCity: true, destinationCity: true, weightKg: true } },
        payment: true,
      },
    })
    if (!job || job.quotedTotal <= 0) throw new AppError('Este envio no esta listo para pagar', 409)

    const amount = job.quotedTotal
    const amountCents = Math.round(amount * 100)
    const platformFeeCents = Math.round(job.platformFee * 100)
    const payment = job.payment ?? await prisma.payment.create({
      data: { amount, platformFee: job.platformFee, netAmount: amount - job.platformFee, amountCents, platformFeeCents, netAmountCents: amountCents - platformFeeCents, currency: 'ARS', userId: req.userId!, shipmentJobId: job.id },
    })
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_reference: payment.id,
        notification_url: webhookUrl,
        items: [{ id: job.id, title: `Envio ${job.shipment.originCity} a ${job.shipment.destinationCity}`, quantity: 1, currency_id: 'ARS', unit_price: amount }],
      }),
    })
    const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string; message?: string }
    if (!response.ok || !data.id || !(data.sandbox_init_point || data.init_point)) throw new AppError(data.message || 'No se pudo iniciar el pago', 502)
    await prisma.payment.update({ where: { id: payment.id }, data: { providerPreferenceId: data.id, externalId: data.id } })
    res.json({ checkoutUrl: data.sandbox_init_point ?? data.init_point, paymentId: payment.id })
  } catch (err) { next(err) }
}

function validWebhookSignature(req: Request, paymentId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  const signature = req.header('x-signature')
  const requestId = req.header('x-request-id')
  if (!secret || !signature) return false
  const parts = Object.fromEntries(signature.split(',').map(part => part.trim().split('=')))
  if (!parts.ts || !parts.v1) return false
  const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId ?? ''};ts:${parts.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const actual = parts.v1
  return expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
}

export async function mercadoPagoWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const paymentId = String(req.query['data.id'] ?? (req.body as { data?: { id?: string } })?.data?.id ?? '')
    if (!paymentId || !validWebhookSignature(req, paymentId)) throw new AppError('Firma de webhook inválida', 401)
    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) throw new AppError('Pagos no configurados', 503)
    const providerResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!providerResponse.ok) throw new AppError('No se pudo verificar el pago', 502)
    const providerPayment = await providerResponse.json() as { status?: string; external_reference?: string }
    if (!providerPayment.external_reference) throw new AppError('Pago sin referencia', 400)
    const payment = await prisma.payment.findUnique({ where: { id: providerPayment.external_reference }, include: { rideBooking: true, shipmentJob: { include: { shipment: true } } } })
    if (!payment) return res.status(200).json({ ok: true })
    if (providerPayment.status === 'approved') {
      await prisma.$transaction(async tx => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'IN_ESCROW', providerPaymentId: paymentId } })
        if (payment.rideBooking) await tx.rideBooking.update({ where: { id: payment.rideBooking.id }, data: { status: 'PAID' } })
      })
      if (payment.rideBooking) emitToUser(payment.rideBooking.passengerId, 'ride:status_changed', { bookingId: payment.rideBooking.id, status: 'PAID' })
      if (payment.shipmentJob) emitToUser(payment.shipmentJob.shipment.senderId, 'shipment:payment_changed', { shipmentId: payment.shipmentJob.shipmentId, status: 'PAID' })
    } else if (['rejected', 'cancelled'].includes(providerPayment.status ?? '')) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', providerPaymentId: paymentId } })
    }
    res.json({ ok: true })
  } catch (err) { next(err) }
}
