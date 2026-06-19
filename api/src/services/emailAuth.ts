import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import prisma from '../lib/prisma'

const EMAIL_CODE_TTL_MINUTES = 15

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function createEmailAuthCode(email: string, userId?: string | null) {
  const normalizedEmail = normalizeEmail(email)
  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000)

  await prisma.emailAuthCode.create({
    data: {
      email: normalizedEmail,
      codeHash,
      expiresAt,
      userId: userId ?? undefined,
    },
  })

  return {
    code,
    expiresAt,
    email: normalizedEmail,
  }
}

async function findActiveCode(email: string) {
  const normalizedEmail = normalizeEmail(email)

  return prisma.emailAuthCode.findFirst({
    where: {
      email: normalizedEmail,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function verifyEmailAuthCode(email: string, code: string) {
  const record = await findActiveCode(email)
  if (!record) return null
  if (record.expiresAt.getTime() < Date.now()) return null

  const valid = await bcrypt.compare(code.trim(), record.codeHash)
  if (!valid) return null

  return record
}

export async function consumeEmailAuthCode(id: string) {
  await prisma.emailAuthCode.update({
    where: { id },
    data: { consumedAt: new Date() },
  })
}

let resendClient: Resend | null = null

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}

export async function sendEmailAuthCode(email: string, code: string) {
  const deliveryMode = process.env.EMAIL_AUTH_DELIVERY_MODE || 'log'
  const subject = 'Tu codigo de acceso a LLEVO'
  const text = `Tu codigo es ${code}. Vence en ${EMAIL_CODE_TTL_MINUTES} minutos.`
  const from = process.env.RESEND_FROM_EMAIL?.trim()

  if (deliveryMode === 'resend') {
    const client = getResendClient()
    if (!client || !from) {
      throw new Error('Faltan RESEND_API_KEY o RESEND_FROM_EMAIL para enviar emails con Resend')
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Tu codigo de acceso a LLEVO</h2>
        <p>Usa este codigo para continuar con tu acceso:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 20px 0;">${code}</p>
        <p>Vence en ${EMAIL_CODE_TTL_MINUTES} minutos.</p>
      </div>
    `

    const { error } = await client.emails.send({
      from,
      to: [email],
      subject,
      text,
      html,
    })

    if (error) {
      throw new Error(error.message || 'No pude enviar el email con Resend')
    }

    return { subject, text }
  }

  if (deliveryMode === 'log') {
    console.log(`[email-auth] ${email} -> ${code}`)
    return { devCode: code, subject, text }
  }

  console.warn(`[email-auth] EMAIL_AUTH_DELIVERY_MODE=${deliveryMode} no esta implementado. Uso fallback a logs.`)
  console.log(`[email-auth] ${email} -> ${code}`)
  return { devCode: code, subject, text }
}

export function getEmailAuthDevCode(code: string) {
  return process.env.NODE_ENV === 'production' ? undefined : code
}

export function buildNameFromEmail(email: string) {
  const localPart = normalizeEmail(email).split('@')[0] || 'Usuario'
  const spaced = localPart.replace(/[._-]+/g, ' ').trim()
  if (!spaced) return 'Usuario'
  return spaced
    .split(/\s+/)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}
