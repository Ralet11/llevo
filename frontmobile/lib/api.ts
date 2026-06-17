export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  constructor(message: string, public status: number) {
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
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(`No se pudo conectar con ${BASE_URL}`)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new ApiError(error.error || 'Error en la peticion', response.status)
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
