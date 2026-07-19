import { io, type Socket } from 'socket.io-client'

// Socket.io conecta al servidor base, no al path /api/v1
const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '')

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket?.disconnect()

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
  })

  socket.on('connect', () => {
    console.log('[socket] conectado', socket?.id)
  })

  socket.on('connect_error', err => {
    console.log('[socket] error de conexión:', err.message)
  })

  socket.on('disconnect', reason => {
    console.log('[socket] desconectado:', reason)
  })

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}
