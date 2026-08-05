import dotenv from 'dotenv'
dotenv.config()

import { createServer } from 'http'
import app from './app'
import prisma from './lib/prisma'
import { initSocketIO } from './lib/socket'
import { checkTimeouts } from './services/shipmentQueue'
import { loadEnv } from './config/env'
import { publishExpiredTravelRequests } from './services/travelRequestMatching'
import { reconcileDemoShipmentBot } from './services/demoShipmentBot'

async function start() {
  const env = loadEnv()
  const PORT = env.PORT

  try {
    await prisma.$connect()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('No pude conectar a PostgreSQL con DATABASE_URL.')
    console.error('Revisa usuario, password, host, puerto y nombre de base de datos en api/.env.')
    console.error(message)
    process.exit(1)
  }

  const httpServer = createServer(app)
  initSocketIO(httpServer)

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 LLEVO API corriendo en http://localhost:${PORT}`)
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   Socket.io activo en ws://localhost:${PORT}`)
  })

  async function reconcileQueues() {
    await Promise.all([
      checkTimeouts(),
      publishExpiredTravelRequests(),
      reconcileDemoShipmentBot(),
    ])
  }

  // El estado y deadlines están en PostgreSQL: la reconciliación es idempotente
  // y recupera solicitudes vencidas incluso después de reiniciar el proceso.
  void reconcileQueues().catch(err => console.error('[queue] Error en reconciliación:', err))
  setInterval(() => {
    reconcileQueues().catch(err => console.error('[queue] Error en reconciliación:', err))
  }, 60 * 1000)
}

void start()
