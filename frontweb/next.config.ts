import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // El repositorio contiene varios proyectos Node; el tracing debe quedar
  // delimitado a esta aplicación y no inferirse desde un lockfile externo.
  outputFileTracingRoot: __dirname,
  // Configurar el dominio de la API
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
}

export default nextConfig
