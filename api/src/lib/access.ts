import jwt from 'jsonwebtoken'
import prisma from './prisma'
import { AppError } from '../middleware/errorHandler'

export function accessUserId(token: string): string {
  const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] })
  if (typeof payload === 'string' || payload.purpose !== 'access' ||
      typeof payload.userId !== 'string' || !payload.userId.trim()) {
    throw new AppError('Token de acceso inválido', 401)
  }
  return payload.userId
}

export async function requireActiveUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.isActive) throw new AppError('Cuenta no disponible', 401)
  if (process.env.INTERNAL_TESTING === 'true') {
    const emails = (process.env.INTERNAL_TESTER_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (!user.email || !emails.includes(user.email.toLowerCase())) {
      throw new AppError('Esta versión está reservada a cuentas de pruebas autorizadas', 403)
    }
  }
  return user
}
