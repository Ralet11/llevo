import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { accessUserId, requireActiveUser } from './access'

let io: Server | null = null

export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('No autenticado'))
    try {
      const userId = accessUserId(token)
      await requireActiveUser(userId)
      socket.data.userId = userId
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', socket => {
    const userId = socket.data.userId as string
    void socket.join(`user:${userId}`)
    console.log(`[socket] conectado  user:${userId} socket:${socket.id}`)

    socket.on('disconnect', reason => {
      console.log(`[socket] desconectado user:${userId}: ${reason}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('[socket] Socket.io no inicializado')
  return io
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return // silencioso antes del start()
  io.to(`user:${userId}`).emit(event, data)
}
