import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configurar el dominio de la API
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
}

export default nextConfig
