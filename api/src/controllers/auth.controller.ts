import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { Expo } from 'expo-server-sdk'
import prisma from '../lib/prisma'
import { publicUserSelect } from '../lib/publicUser'
import { normalizePhoneNumber } from '../lib/phone'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import { checkPhoneVerificationCode, sendPhoneVerificationCode } from '../services/twilioVerify'

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

const sendPhoneCodeSchema = z.object({
  phone: z.string().min(8),
  intent: z.enum(['login', 'register']).default('login'),
})

const registerWithPhoneSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  code: z.string().trim().min(4).max(10),
  email: z.string().email().optional(),
})

const loginWithPhoneSchema = z.object({
  phone: z.string().min(8),
  code: z.string().trim().min(4).max(10),
})

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions)
}

async function buildAuthResponse(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  })

  if (!user) throw new AppError('Usuario no encontrado', 404)
  return { user, token: signToken(user.id) }
}

async function ensureEmailAndPhoneAreAvailable(email?: string, phone?: string) {
  const checks = await Promise.all([
    email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
    phone ? prisma.user.findUnique({ where: { phone } }) : Promise.resolve(null),
  ])

  if (checks[0]) throw new AppError('El email ya esta registrado', 409)
  if (checks[1]) throw new AppError('El telefono ya esta registrado', 409)
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body)
    const normalizedPhone = data.phone ? normalizePhoneNumber(data.phone) : undefined

    await ensureEmailAndPhoneAreAvailable(data.email, normalizedPhone)

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: normalizedPhone,
        passwordHash,
      },
      select: publicUserSelect,
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
    if (!user?.passwordHash) throw new AppError('Credenciales invalidas', 401)

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) throw new AppError('Credenciales invalidas', 401)

    res.json(await buildAuthResponse(user.id))
  } catch (err) {
    next(err)
  }
}

export async function sendPhoneCode(req: Request, res: Response, next: NextFunction) {
  try {
    const data = sendPhoneCodeSchema.parse(req.body)
    const phone = normalizePhoneNumber(data.phone)
    const existingUser = await prisma.user.findUnique({ where: { phone } })

    if (data.intent === 'register' && existingUser) {
      throw new AppError('El telefono ya esta registrado', 409)
    }

    await sendPhoneVerificationCode({ phone })
    res.json({ ok: true, phone })
  } catch (err) {
    next(err)
  }
}

export async function registerWithPhone(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerWithPhoneSchema.parse(req.body)
    const phone = normalizePhoneNumber(data.phone)

    await ensureEmailAndPhoneAreAvailable(data.email, phone)
    await checkPhoneVerificationCode({ phone, code: data.code })

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone,
        phoneVerifiedAt: new Date(),
      },
      select: publicUserSelect,
    })

    res.status(201).json({ user, token: signToken(user.id) })
  } catch (err) {
    next(err)
  }
}

export async function loginWithPhone(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginWithPhoneSchema.parse(req.body)
    const phone = normalizePhoneNumber(data.phone)
    await checkPhoneVerificationCode({ phone, code: data.code })

    let user = await prisma.user.findUnique({ where: { phone } })

    if (!user) {
      user = await prisma.user.create({
        data: { name: 'Usuario', phone, phoneVerifiedAt: new Date() },
      })
    } else if (!user.phoneVerifiedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      })
    }

    res.json(await buildAuthResponse(user.id))
  } catch (err) {
    next(err)
  }
}

export async function savePushToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { pushToken } = req.body as { pushToken: unknown }
    if (!pushToken || typeof pushToken !== 'string') {
      throw new AppError('pushToken requerido', 400)
    }
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new AppError('pushToken inválido', 400)
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { pushToken },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: publicUserSelect,
    })
    if (!user) throw new AppError('Usuario no encontrado', 404)
    res.json({ user })
  } catch (err) {
    next(err)
  }
}
