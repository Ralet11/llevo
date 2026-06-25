import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { OAuth2Client } from 'google-auth-library'
import appleSignin from 'apple-signin-auth'
import { Expo } from 'expo-server-sdk'
import prisma from '../lib/prisma'
import { publicUserSelect } from '../lib/publicUser'
import { normalizePhoneNumber } from '../lib/phone'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import {
  buildNameFromEmail,
  consumeEmailAuthCode,
  createEmailAuthCode,
  getEmailAuthDevCode,
  sendEmailAuthCode,
  verifyEmailAuthCode,
} from '../services/emailAuth'
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

const emailAuthStartSchema = z.object({
  email: z.string().email(),
})

const emailAuthVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(10),
})

const emailAuthSetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(10),
  password: z.string().min(6),
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

const googleAuthSchema = z.object({
  idToken: z.string().min(10),
})

const appleAuthSchema = z.object({
  identityToken: z.string().min(10),
  // Apple solo manda el nombre la primera vez, desde el cliente. Es opcional.
  fullName: z.string().trim().min(1).optional(),
})

// Bundle IDs validos como audiencia del identity token de Apple (app nativa).
function getAppleClientIds(): string[] {
  const raw = process.env.APPLE_CLIENT_IDS || process.env.APPLE_BUNDLE_ID || ''
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

// Acepta uno o varios client IDs (web/android/ios) separados por coma. Son la
// "audiencia" valida del id_token. Se cargan por env, sin hardcodear secretos.
function getGoogleClientIds(): string[] {
  const raw = process.env.GOOGLE_OAUTH_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || ''
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

const googleClient = new OAuth2Client()

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function buildAuthResponse(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  })

  if (!user) throw new AppError('Usuario no encontrado', 404)
  return { user, token: signToken(user.id) }
}

export async function loginWithGoogle(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = googleAuthSchema.parse(req.body)

    const audience = getGoogleClientIds()
    if (audience.length === 0) {
      throw new AppError('Google OAuth no esta configurado en el servidor', 500)
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload.email_verified) {
      throw new AppError('No pudimos validar tu cuenta de Google', 401)
    }

    const email = normalizeEmail(payload.email)

    // Match por email: si ya existe (alta por email/telefono), reusa la cuenta;
    // si no, crea una nueva ya verificada (Google confirma el email).
    let user = await prisma.user.findUnique({ where: { email }, select: publicUserSelect })
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: payload.name?.trim() || buildNameFromEmail(email),
          email,
          avatarUrl: payload.picture || undefined,
          isVerified: true,
        },
        select: publicUserSelect,
      })
    }

    res.json({ user, token: signToken(user.id) })
  } catch (err) {
    next(err)
  }
}

export async function loginWithApple(req: Request, res: Response, next: NextFunction) {
  try {
    const { identityToken, fullName } = appleAuthSchema.parse(req.body)

    const audience = getAppleClientIds()
    if (audience.length === 0) {
      throw new AppError('Apple Sign-In no esta configurado en el servidor', 500)
    }

    // Verifica firma (claves publicas de Apple), issuer y audiencia (bundle id).
    const payload = await appleSignin.verifyIdToken(identityToken, { audience })
    const appleId = payload.sub
    if (!appleId) {
      throw new AppError('No pudimos validar tu cuenta de Apple', 401)
    }

    // El email solo viene si el usuario lo comparte; puede ser un relay de Apple.
    const email = payload.email ? normalizeEmail(payload.email) : undefined

    // Match por appleId (estable) primero; si no, por email (vincula cuentas ya
    // creadas por email/telefono); si no existe, crea una nueva verificada.
    let user = await prisma.user.findUnique({ where: { appleId }, select: publicUserSelect })

    if (!user && email) {
      const byEmail = await prisma.user.findUnique({ where: { email }, select: publicUserSelect })
      if (byEmail) {
        // Cuenta existente sin vincular: la asociamos al appleId para proximos logins.
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { appleId },
          select: publicUserSelect,
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: fullName?.trim() || (email ? buildNameFromEmail(email) : 'Usuario'),
          email,
          appleId,
          isVerified: true,
        },
        select: publicUserSelect,
      })
    }

    res.json({ user, token: signToken(user.id) })
  } catch (err) {
    next(err)
  }
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

export async function startEmailAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const data = emailAuthStartSchema.parse(req.body)
    const email = normalizeEmail(data.email)
    const user = await prisma.user.findUnique({ where: { email } })

    if (user?.passwordHash) {
      res.json({ nextStep: 'password' as const })
      return
    }

    const { code } = await createEmailAuthCode(email, user?.id)
    await sendEmailAuthCode(email, code)

    res.json({
      nextStep: 'code' as const,
      devCode: getEmailAuthDevCode(code),
    })
  } catch (err) {
    next(err)
  }
}

export async function verifyEmailCode(req: Request, res: Response, next: NextFunction) {
  try {
    const data = emailAuthVerifySchema.parse(req.body)
    const record = await verifyEmailAuthCode(data.email, data.code)
    if (!record) throw new AppError('Codigo invalido o vencido', 401)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function setEmailPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = emailAuthSetPasswordSchema.parse(req.body)
    const email = normalizeEmail(data.email)
    const record = await verifyEmailAuthCode(email, data.code)
    if (!record) throw new AppError('Codigo invalido o vencido', 401)

    const passwordHash = await bcrypt.hash(data.password, 10)
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser?.passwordHash) {
      throw new AppError('Esta cuenta ya tiene contrasena configurada', 409)
    }

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash },
          select: publicUserSelect,
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            name: buildNameFromEmail(email),
          },
          select: publicUserSelect,
        })

    await consumeEmailAuthCode(record.id)
    res.json({ user, token: signToken(user.id) })
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
