import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import access from '../dist/lib/access.js'
import prismaModule from '../dist/lib/prisma.js'
import payments from '../dist/controllers/payments.controller.js'
import shipments from '../dist/controllers/shipments.controller.js'
import bookings from '../dist/controllers/rideBookings.controller.js'
import transaction from '../dist/lib/transaction.js'
import internalBots from '../dist/services/internalBots.js'
import internalBotsController from '../dist/controllers/internalBots.controller.js'
import demoRideBot from '../dist/services/demoRideBot.js'
import demoShipmentBot from '../dist/services/demoShipmentBot.js'
import errors from '../dist/middleware/errorHandler.js'
import { Prisma } from '@prisma/client'

const prisma = prismaModule.default
process.env.JWT_SECRET = 'synthetic-test-key-at-least-32-characters'
const token = payload => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' })

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

// Prisma delegates use a Proxy; Node's descriptor-based mock.method cannot replace them.
function stub(t, target, key, implementation) {
  const original = target[key]
  assert.equal(typeof original, 'function')
  target[key] = implementation
  t.after(() => { target[key] = original })
  return { mock: { mockImplementation(fn) { target[key] = fn } } }
}

async function invoke(handler, req = {}) {
  let body, error
  const res = { json(value) { body = value; return this }, status() { return this } }
  await handler({ userId: 'tester', params: { id: 'ride' }, body: {}, ...req }, res, err => { error = err })
  return { body, error }
}

test('rechaza tokens de setup, sin identidad, expirados y firmados por otra clave', () => {
  for (const payload of [{ purpose: 'email-password-setup', email: 'test@example.invalid' }, { purpose: 'access' }, { purpose: 'access', userId: '' }, { userId: 'tester' }]) {
    assert.throws(() => access.accessUserId(token(payload)))
  }
  assert.throws(() => access.accessUserId(jwt.sign({ purpose: 'access', userId: 'tester', exp: 1 }, process.env.JWT_SECRET)))
  assert.throws(() => access.accessUserId(jwt.sign({ purpose: 'access', userId: 'tester' }, 'other-key')))
  assert.equal(access.accessUserId(token({ purpose: 'access', userId: 'tester' })), 'tester')
})

test('JSON malformado responde 400 y no se registra como error interno', () => {
  const malformed = new SyntaxError('invalid JSON')
  malformed.type = 'entity.parse.failed'
  let status, body
  const res = { status(value) { status = value; return this }, json(value) { body = value; return this } }
  errors.errorHandler(malformed, { requestId: 'request' }, res, () => {})
  assert.equal(status, 400)
  assert.deepEqual(body, { error: 'El cuerpo JSON no es válido' })
})

test('cuentas suspendidas y fuera de la lista no tienen acceso', async t => {
  process.env.INTERNAL_TESTING = 'true'
  process.env.INTERNAL_TESTER_EMAILS = 'tester@example.invalid'
  const find = stub(t, prisma.user, 'findUnique', async () => ({ isActive: false, email: 'tester@example.invalid' }))
  await assert.rejects(access.requireActiveUser('tester'), /Cuenta/)
  find.mock.mockImplementation(async () => ({ isActive: true, email: 'other@example.invalid' }))
  await assert.rejects(access.requireActiveUser('tester'), /reservada/)
  find.mock.mockImplementation(async () => ({ isActive: true, email: 'tester@example.invalid' }))
  assert.equal((await access.requireActiveUser('tester')).isActive, true)
})

test('los bots requieren interruptor maestro, allowlist y preferencia individual', async t => {
  const previous = {
    internal: process.env.INTERNAL_TESTING,
    available: process.env.INTERNAL_BOTS_AVAILABLE,
    emails: process.env.INTERNAL_TESTER_EMAILS,
  }
  t.after(() => {
    restoreEnv('INTERNAL_TESTING', previous.internal)
    restoreEnv('INTERNAL_BOTS_AVAILABLE', previous.available)
    restoreEnv('INTERNAL_TESTER_EMAILS', previous.emails)
  })
  process.env.INTERNAL_TESTING = 'true'
  process.env.INTERNAL_BOTS_AVAILABLE = 'true'
  process.env.INTERNAL_TESTER_EMAILS = 'tester@example.invalid'
  const find = stub(t, prisma.user, 'findUnique', async () => ({
    isActive: true,
    email: 'tester@example.invalid',
    demoRideBotEnabled: true,
    demoShipmentBotEnabled: false,
  }))
  assert.equal(await internalBots.testerWantsBot('tester', 'ride'), true)
  assert.equal(await internalBots.testerWantsBot('tester', 'shipment'), false)
  find.mock.mockImplementation(async () => ({ isActive: true, email: 'outside@example.invalid', demoRideBotEnabled: true, demoShipmentBotEnabled: true }))
  assert.equal(await internalBots.testerWantsBot('tester', 'ride'), false)
  process.env.INTERNAL_BOTS_AVAILABLE = 'false'
  assert.equal(await internalBots.testerWantsBot('tester', 'ride'), false)
})

test('cada tester solo actualiza sus propios interruptores de bots', async t => {
  const previous = { internal: process.env.INTERNAL_TESTING, available: process.env.INTERNAL_BOTS_AVAILABLE }
  t.after(() => {
    restoreEnv('INTERNAL_TESTING', previous.internal)
    restoreEnv('INTERNAL_BOTS_AVAILABLE', previous.available)
  })
  process.env.INTERNAL_TESTING = 'true'
  process.env.INTERNAL_BOTS_AVAILABLE = 'true'
  stub(t, prisma.user, 'update', async args => {
    assert.equal(args.where.id, 'tester')
    assert.deepEqual(args.data, { demoRideBotEnabled: true, demoShipmentBotEnabled: false })
    return { demoRideBotEnabled: true, demoShipmentBotEnabled: false }
  })
  const result = await invoke(internalBotsController.updateInternalBotPreferences, {
    body: { rideEnabled: true, shipmentEnabled: false },
  })
  assert.equal(result.error, undefined)
  assert.deepEqual(result.body, { available: true, rideEnabled: true, shipmentEnabled: false })
})

test('el bot de viaje completa la reserva y libera solo el pago simulado', async t => {
  const previous = { internal: process.env.INTERNAL_TESTING, available: process.env.INTERNAL_BOTS_AVAILABLE }
  t.after(() => {
    restoreEnv('INTERNAL_TESTING', previous.internal)
    restoreEnv('INTERNAL_BOTS_AVAILABLE', previous.available)
  })
  process.env.INTERNAL_TESTING = 'true'
  process.env.INTERNAL_BOTS_AVAILABLE = 'true'
  const writes = []
  const booking = {
    id: 'ride', passengerId: 'tester', status: 'PAID', travelRequestId: null,
    route: { driver: { email: 'demo-ride-tester@llevo.invalid' } },
    payment: { id: 'payment', status: 'IN_ESCROW' },
  }
  stub(t, prisma, '$transaction', async work => work({
    rideBooking: {
      findUnique: async () => booking,
      updateMany: async args => { writes.push(args.data.status); return { count: 1 } },
    },
    payment: { update: async args => writes.push(args.data.status) },
  }))
  assert.equal(await demoRideBot.runDemoRideCompletion('ride'), true)
  assert.deepEqual(writes, ['COMPLETED', 'RELEASED'])
})

test('el bot de envío exige pago, retira, entrega y libera el pago', async t => {
  const previous = { internal: process.env.INTERNAL_TESTING, available: process.env.INTERNAL_BOTS_AVAILABLE }
  t.after(() => {
    restoreEnv('INTERNAL_TESTING', previous.internal)
    restoreEnv('INTERNAL_BOTS_AVAILABLE', previous.available)
  })
  process.env.INTERNAL_TESTING = 'true'
  process.env.INTERNAL_BOTS_AVAILABLE = 'true'
  const job = {
    id: 'job', shipmentId: 'shipment', pickedUpAt: null, deliveredAt: null,
    driver: { email: demoShipmentBot.DEMO_SHIPMENT_BOT_EMAIL },
    payment: { id: 'payment', status: 'IN_ESCROW' },
    shipment: { senderId: 'tester', status: 'ASSIGNED', destinationCity: 'Córdoba', sender: { pushToken: null } },
  }
  const writes = []
  const find = stub(t, prisma.shipmentJob, 'findUnique', async () => job)
  stub(t, prisma, '$transaction', async work => work({
    shipment: { updateMany: async args => { writes.push(args.data.status); return { count: 1 } } },
    shipmentJob: { update: async args => writes.push(args.data.status ?? 'PICKED_UP_AT') },
    payment: { update: async args => writes.push(args.data.status) },
  }))
  assert.equal(await demoShipmentBot.runDemoShipmentPickup('job'), true)
  job.shipment.status = 'PICKED_UP'
  job.pickedUpAt = new Date()
  find.mock.mockImplementation(async () => job)
  assert.equal(await demoShipmentBot.runDemoShipmentDelivery('job'), true)
  assert.deepEqual(writes, ['PICKED_UP', 'PICKED_UP_AT', 'DELIVERED', 'COMPLETED', 'RELEASED'])
})

test('checkout no puede mover dinero ni funcionar fuera del modo interno', async t => {
  process.env.INTERNAL_TESTING = 'false'
  const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network') })
  for (const handler of [payments.createRideCheckout, payments.createShipmentCheckout]) {
    const result = await invoke(handler)
    assert.equal(result.error?.statusCode, 503)
  }
  assert.equal(network.mock.callCount(), 0)
})

test('checkout de viaje repetido reutiliza pago y valida propietario', async t => {
  process.env.INTERNAL_TESTING = 'true'
  let storedPayment, writes = 0
  const b = { id: 'ride', status: 'APPROVED', pricePerSeat: 100, seats: 2, route: { driverId: 'driver', driver: { email: 'driver@example.invalid' } } }
  const tx = {
    rideBooking: { findFirst: async args => { assert.equal(args.where.passengerId, 'tester'); return b }, update: async () => { b.status = 'PAID' } },
    payment: { upsert: async args => { if (!storedPayment) { storedPayment = { id: 'pay', ...args.create }; writes++ }; return storedPayment } },
  }
  stub(t, prisma, '$transaction', async (work, options) => { assert.equal(options.isolationLevel, 'Serializable'); return work(tx) })
  const first = await invoke(payments.createRideCheckout)
  const second = await invoke(payments.createRideCheckout)
  assert.equal(first.error, undefined)
  assert.deepEqual(first.body, { simulated: true, checkoutUrl: null, paymentId: 'pay' })
  assert.deepEqual(second.body, first.body)
  assert.equal(writes, 1)
  assert.equal(storedPayment.amountCents, 20000)
})

test('una reserva cancelada no puede ser pagada', async t => {
  process.env.INTERNAL_TESTING = 'true'
  stub(t, prisma, '$transaction', async work => work({ rideBooking: { findFirst: async () => ({ status: 'CANCELLED' }) } }))
  assert.equal((await invoke(payments.createRideCheckout)).error?.statusCode, 409)
})

test('retiro exige ID, propiedad del trabajo y pago confirmado', async t => {
  assert.ok((await invoke(shipments.markPickedUp)).error)
  const tx = { shipmentJob: { findFirst: async args => { assert.deepEqual(args.where, { id: 'job', driverId: 'tester' }); return null } } }
  stub(t, prisma, '$transaction', async work => work(tx))
  assert.equal((await invoke(shipments.markPickedUp, { body: { jobId: 'job' } })).error?.statusCode, 404)
  tx.shipmentJob.findFirst = async () => ({ status: 'ACTIVE', shipment: { status: 'ASSIGNED' }, payment: null })
  assert.equal((await invoke(shipments.markPickedUp, { body: { jobId: 'job' } })).error?.statusCode, 409)
})

test('entregar sin retiro falla y no altera registros', async t => {
  stub(t, prisma, '$transaction', async work => work({ shipmentJob: { findFirst: async () => ({ status: 'ACTIVE', payment: { status: 'IN_ESCROW' }, shipment: { status: 'ASSIGNED' }, pickedUpAt: null }) } }))
  assert.equal((await invoke(shipments.markDelivered, { body: { jobId: 'job' } })).error?.statusCode, 409)
})

test('cancelar envío cierra ambas entidades y anula solo el pago simulado', async t => {
  const updates = []
  stub(t, prisma, '$transaction', async work => work({
    shipmentJob: { findFirst: async () => ({ id: 'job', shipmentId: 'shipment', status: 'ACTIVE', pickedUpAt: null, shipment: { status: 'ASSIGNED', senderId: 'sender' }, payment: { id: 'pay', externalId: 'internal:job' } }), update: async args => updates.push(args.data.status) },
    shipment: { update: async args => updates.push(args.data.status) },
    payment: { update: async args => updates.push(args.data.status) },
  }))
  assert.equal((await invoke(shipments.cancelActiveJob, { body: { jobId: 'job' } })).error, undefined)
  assert.deepEqual(updates, ['CANCELLED', 'CANCELLED', 'REFUNDED'])
})

test('no se puede aprobar un asiento sin cupo', async t => {
  stub(t, prisma, '$transaction', async work => work({
    rideBooking: { findUnique: async () => ({ status: 'PENDING', date: '2099-01-01', seats: 1, route: { id: 'route', driverId: 'tester', isActive: true, carriesPassengers: true, seatsOffered: 1 } }), aggregate: async () => ({ _sum: { seats: 1 } }) },
    user: { findUnique: async () => ({ isActive: true, driverVerificationStatus: 'APPROVED' }) },
    driverDayOff: { findFirst: async () => null },
  }))
  assert.equal((await invoke(bookings.respondBooking, { body: { action: 'approve' } })).error?.statusCode, 409)
})

test('serialización reintenta toda la operación y limita conflictos', async t => {
  let attempts = 0
  stub(t, prisma, '$transaction', async () => {
    attempts++
    throw new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })
  })
  await assert.rejects(transaction.serializable(async () => 1), /Actualizá/)
  assert.equal(attempts, 3)
})
