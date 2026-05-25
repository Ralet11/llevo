import dotenv from 'dotenv'
dotenv.config()

import app from './app'
import prisma from './lib/prisma'

const PORT = Number(process.env.PORT || 3001)

function validateDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('Falta DATABASE_URL en api/.env')
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL no es una URL valida de PostgreSQL')
  }

  const username = decodeURIComponent(parsed.username)
  const password = decodeURIComponent(parsed.password)

  if (!username || username === 'USER' || !password || password === 'PASSWORD') {
    throw new Error(
      'DATABASE_URL sigue con credenciales de ejemplo. Reemplaza USER y PASSWORD por tu usuario y clave reales de PostgreSQL en api/.env'
    )
  }
}

async function start() {
  validateDatabaseUrl()

  try {
    await prisma.$connect()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('No pude conectar a PostgreSQL con DATABASE_URL.')
    console.error('Revisa usuario, password, host, puerto y nombre de base de datos en api/.env.')
    console.error(message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`🚀 LLEVO API corriendo en http://localhost:${PORT}`)
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`)
  })
}

void start()
