import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { publicUserSelect } from '../lib/publicUser'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/authenticate'
import {
  buildDriverVerificationUpdate,
  buildBypassedDriverVerificationUpdate,
  createDiditDriverSession,
  driverVerificationNote,
  getDiditSessionDecision,
  isDriverVerificationBypassed,
  verifyDiditWebhook,
  type DiditSessionStatus,
} from '../services/didit'

const DIDIT_VALID_STATUSES: readonly DiditSessionStatus[] = [
  'Not Started', 'In Progress', 'Awaiting User', 'In Review',
  'Approved', 'Declined', 'Resubmitted', 'Expired', 'Abandoned', 'Kyc Expired',
]

function parseDiditStatus(raw: unknown): DiditSessionStatus {
  if (typeof raw === 'string' && (DIDIT_VALID_STATUSES as string[]).includes(raw)) {
    return raw as DiditSessionStatus
  }
  return 'Not Started'
}

const startDriverVerificationSchema = z.object({
  callbackUrl: z.string().trim().min(1).optional(),
})

const statusQuerySchema = z.object({
  sync: z.enum(['0', '1']).optional(),
})

function getFallbackCallbackUrl() {
  return process.env.DIDIT_CALLBACK_URL?.trim()
}

async function syncDriverVerificationStatus(userId: string, sessionId: string) {
  const decision = await getDiditSessionDecision(sessionId)
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: buildDriverVerificationUpdate(decision),
    select: publicUserSelect,
  })

  return { decision, user: updatedUser }
}

export async function startDriverVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = startDriverVerificationSchema.parse(req.body)
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerifiedAt: true,
        email: true,
        driverVerificationStatus: true,
        driverVerificationSessionId: true,
        driverVerificationUrl: true,
      },
    })

    if (!user) throw new AppError('Usuario no encontrado', 404)
    if (!user.phone) throw new AppError('Tu cuenta necesita un telefono para activar el modo conductor', 400)
    if (!user.phoneVerifiedAt) throw new AppError('Debes verificar tu telefono antes de seguir con Didit', 403)

    if (isDriverVerificationBypassed()) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: buildBypassedDriverVerificationUpdate(user.id),
        select: publicUserSelect,
      })

      return res.json({
        status: updatedUser.driverVerificationStatus,
        sessionId: updatedUser.driverVerificationSessionId,
        verificationUrl: updatedUser.driverVerificationUrl,
        alreadyVerified: true,
        bypassed: true,
      })
    }

    if (user.driverVerificationStatus === 'APPROVED' && user.driverVerificationSessionId) {
      return res.json({
        status: user.driverVerificationStatus,
        sessionId: user.driverVerificationSessionId,
        verificationUrl: user.driverVerificationUrl,
        alreadyVerified: true,
      })
    }

    const callbackUrl = data.callbackUrl || getFallbackCallbackUrl()
    if (!callbackUrl) {
      throw new AppError('Falta DIDIT_CALLBACK_URL o callbackUrl para redirigir al usuario al volver de Didit', 500)
    }

    if (
      user.driverVerificationSessionId &&
      ['PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'RESUBMITTED'].includes(user.driverVerificationStatus)
    ) {
      return res.status(202).json({
        status: user.driverVerificationStatus,
        sessionId: user.driverVerificationSessionId,
        verificationUrl: user.driverVerificationUrl,
      })
    }

    const session = await createDiditDriverSession({
      callbackUrl,
      vendorData: user.id,
      phone: user.phone,
      metadata: {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        flow: 'driver-onboarding',
      },
    })

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...buildDriverVerificationUpdate(session),
        driverVerificationSubmittedAt: new Date(),
      },
      select: publicUserSelect,
    })

    res.status(201).json({
      status: updatedUser.driverVerificationStatus,
      sessionId: updatedUser.driverVerificationSessionId,
      verificationUrl: updatedUser.driverVerificationUrl,
    })
  } catch (err) {
    next(err)
  }
}

export async function getDriverVerificationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query = statusQuerySchema.parse(req.query)
    let user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        ...publicUserSelect,
        driverVerificationSubmittedAt: true,
        driverVerificationCheckedAt: true,
        driverVerificationNotes: true,
      },
    })

    if (!user) throw new AppError('Usuario no encontrado', 404)

    if (isDriverVerificationBypassed()) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: buildBypassedDriverVerificationUpdate(user.id),
        select: publicUserSelect,
      })

      return res.json({
        status: updatedUser.driverVerificationStatus,
        sessionId: updatedUser.driverVerificationSessionId,
        verificationUrl: updatedUser.driverVerificationUrl,
        submittedAt: new Date(),
        checkedAt: new Date(),
        verifiedAt: updatedUser.driverVerifiedAt,
        notes: 'Verificacion de Didit omitida temporalmente por configuracion local.',
        user: updatedUser,
        bypassed: true,
      })
    }

    if (query.sync === '1' && user.driverVerificationSessionId) {
      const result = await syncDriverVerificationStatus(user.id, user.driverVerificationSessionId)
      user = {
        ...result.user,
        driverVerificationSubmittedAt: user.driverVerificationSubmittedAt,
        driverVerificationCheckedAt: new Date(),
        driverVerificationNotes: driverVerificationNote(result.user.driverVerificationStatus),
      }
    }

    res.json({
      status: user.driverVerificationStatus,
      sessionId: user.driverVerificationSessionId,
      verificationUrl: user.driverVerificationUrl,
      submittedAt: user.driverVerificationSubmittedAt,
      checkedAt: user.driverVerificationCheckedAt,
      verifiedAt: user.driverVerifiedAt,
      notes: user.driverVerificationNotes,
      user,
    })
  } catch (err) {
    next(err)
  }
}

export async function handleDiditWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET?.trim()
    if (!webhookSecret) throw new AppError('Falta DIDIT_WEBHOOK_SECRET para validar webhooks de Didit', 500)

    const rawBody = (req as Request & { rawBody?: string }).rawBody
    if (!rawBody) throw new AppError('No pude leer el body crudo del webhook de Didit', 400)

    const { payload, trustedDecision } = verifyDiditWebhook(
      rawBody,
      {
        signature: req.get('X-Signature'),
        signatureV2: req.get('X-Signature-V2'),
        signatureSimple: req.get('X-Signature-Simple'),
        timestamp: req.get('X-Timestamp'),
      },
      webhookSecret,
    )

    const sessionId = typeof payload.session_id === 'string' ? payload.session_id : null
    const vendorData = typeof payload.vendor_data === 'string' ? payload.vendor_data : null
    if (!sessionId) throw new AppError('Webhook de Didit sin session_id', 400)

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { driverVerificationSessionId: sessionId },
          ...(vendorData ? [{ id: vendorData }] : []),
        ],
      },
      select: { id: true },
    })

    if (!user) {
      res.status(202).json({ ok: true, ignored: true })
      return
    }

    const status = parseDiditStatus(payload.status)
    const url = typeof payload.url === 'string' ? payload.url : undefined
    const decision = trustedDecision && payload.decision && typeof payload.decision === 'object'
      ? payload.decision as Record<string, unknown>
      : undefined

    await prisma.user.update({
      where: { id: user.id },
      data: buildDriverVerificationUpdate({
        session_id: sessionId,
        status,
        url,
        decision,
      }),
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
