import assert from 'node:assert/strict'
import test from 'node:test'
import { quoteShipment } from '../dist/services/shipmentPricing.js'

test('la cotizacion de envio desglosa distancia, tiempo, peso, tamaño y servicio', () => {
  const quote = quoteShipment({ distanceKm: 10, durationMin: 30, weightKg: 2, packageSize: 'LARGE' })

  assert.equal(quote.baseFee, 1500)
  assert.equal(quote.distanceFee, 6000)
  assert.equal(quote.timeFee, 1050)
  assert.equal(quote.weightFee, 500)
  assert.equal(quote.sizeSurcharge, 1200)
  assert.equal(quote.platformFee, 1230)
  assert.equal(quote.total, 11480)
})
