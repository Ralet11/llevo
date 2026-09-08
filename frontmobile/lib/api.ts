export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
const API_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '')

export async function assertInternalReleaseBackend() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(`${API_ORIGIN}/health`, { signal: controller.signal })
    if (!response.ok) throw new Error('El backend no está disponible')
    const health = await response.json() as {
      release?: string
      payments?: string
      internalTesting?: boolean
    }
    if (
      health.release !== 'internal-mvp' ||
      health.payments !== 'simulated-only' ||
      health.internalTesting !== true
    ) {
      throw new Error('El backend publicado no corresponde al MVP interno')
    }
  } finally {
    clearTimeout(timeout)
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public requestId?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw new Error('No pudimos conectar. Revisá tu conexión y volvé a intentar.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new ApiError(error.error || 'Error en la petición', response.status, response.headers.get('X-Request-Id') ?? undefined)
  }

  return response.json()
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { token }),
  post: <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'POST', body, token }),
  patch: <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'PATCH', body, token }),
  put: <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'PUT', body, token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
}
