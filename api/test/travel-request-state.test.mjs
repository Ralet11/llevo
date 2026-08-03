import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertTravelRequestTransition,
  canTransitionTravelRequest,
  isActiveTravelRequestStatus,
} from '../dist/lib/travelRequestState.js'

test('permite publicar una solicitud que sigue buscando', () => {
  assert.equal(canTransitionTravelRequest('SEARCHING', 'PUBLISHED'), true)
  assert.doesNotThrow(() => assertTravelRequestTransition('SEARCHING', 'PUBLISHED'))
})

test('impide reabrir una solicitud cancelada', () => {
  assert.equal(canTransitionTravelRequest('CANCELLED', 'SEARCHING'), false)
  assert.throws(
    () => assertTravelRequestTransition('CANCELLED', 'SEARCHING'),
    /No se puede pasar una solicitud/,
  )
})

test('solo los estados vigentes se consideran activos', () => {
  assert.equal(isActiveTravelRequestStatus('SEARCHING'), true)
  assert.equal(isActiveTravelRequestStatus('CONFIRMED'), true)
  assert.equal(isActiveTravelRequestStatus('COMPLETED'), false)
  assert.equal(isActiveTravelRequestStatus('CANCELLED'), false)
})
