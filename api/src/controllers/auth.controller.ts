import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions)
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body)

    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) throw new AppError('El email ya está registrado', 409)

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, phone: data.phone, passwordHash },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })

    res.status(201).json({ user, token: signToken(user.id) })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: data.email } })
    if (!user) throw new AppError('Credenciales inválidas', 401)

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) throw new AppError('Credenciales inválidas', 401)

    const { passwordHash: _, ...safeUser } = user
    res.json({ user: safeUser, token: signToken(user.id) })
  } catch (err) {
    next(err)
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, phone: true,
        avatarUrl: true, isVerified: true, rating: true,
        ratingCount: true, createdAt: true,
      },
    })
    if (!user) throw new AppError('Usuario no encontrado', 404)
    res.json({ user })
  } catch (err) {
    next(err)
  }
}
