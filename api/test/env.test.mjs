import assert from 'node:assert/strict'
import test from 'node:test'
import { loadEnv } from '../dist/config/env.js'

const validEnv = {
  DATABASE_URL: 'postgresql://llevo:secure-password@localhost:5432/llevo',
  JWT_SECRET: 'a-secure-secret-with-at-least-thirty-two-characters',
}

test('loadEnv aplica valores seguros por defecto', () => {
  assert.deepEqual(
    loadEnv(validEnv),
    {
      ...validEnv,
      NODE_ENV: 'development',
      PORT: 3001,
      JWT_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:3000',
      HTTP_BODY_LIMIT: '1mb',
    },
  )
})

test('loadEnv rechaza un secreto JWT débil', () => {
  assert.throws(() => loadEnv({ ...validEnv, JWT_SECRET: 'corto' }), /JWT_SECRET/)
})

test('loadEnv requiere una URL PostgreSQL', () => {
  assert.throws(
    () => loadEnv({ ...validEnv, DATABASE_URL: 'https://example.com/db' }),
    /postgresql/,
  )
})

test('loadEnv rechaza credenciales de ejemplo', () => {
  assert.throws(
    () => loadEnv({ ...validEnv, DATABASE_URL: 'postgresql://USER:PASSWORD@localhost:5432/llevo' }),
    /credenciales reales/,
  )
})
