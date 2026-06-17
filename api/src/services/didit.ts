import crypto from 'crypto'
import { DriverVerificationStatus, Prisma } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

export type DiditSessionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Awaiting User'
  | 'In Review'
  | 'Approved'
  | 'Declined'
  | 'Resubmitted'
  | 'Expired'
  | 'Abandoned'
  | 'Kyc Expired'

export type DiditSessionResponse = {
  session_id: string
  status: DiditSessionStatus
  url?: string | null
  workflow_id?: string | null
  callback?: string | null
  vendor_data?: string | null
  metadata?: Record<string, unknown> | null
  decision?: Record<string, unknown> | null
}

type CreateDiditSessionParams = {
  callbackUrl: string
  metadata?: Record<string, unknown>
  phone?: string | null
  vendorData: string
}

type DiditWebhookHeaders = {
  signature?: string | null
  signatureV2?: string | null
  signatureSimple?: string | null
  timestamp?: string | null
}

type VerifiedDiditWebhook = {
  payload: Record<string, unknown>
  trustedDecision: boolean
}

export function isDriverVerificationBypassed(): boolean {
  return process.env.DIDIT_BYPASS_VERIFICATION?.trim().toLowerCase() === 'true'
}

function getDiditConfig() {
  const apiKey = process.env.DIDIT_API_KEY?.trim()
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim()
  if (!apiKey) throw new AppError('Falta DIDIT_API_KEY en el backend', 500)
  if (!workflowId) throw new AppError('Falta DIDIT_WORKFLOW_ID en el backend', 500)

  return {
    apiKey,
    workflowId,
    baseUrl: process.env.DIDIT_API_BASE_URL?.trim() || 'https://verification.didit.me/v3',
  }
}

function buildDiditHeaders() {
  const { apiKey } = getDiditConfig()
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-api-key': apiKey,
  }
}

async function parseDiditResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const payload = text ? JSON.parse(text) as T & { detail?: string; message?: string } : {} as T

  if (!response.ok) {
    const errorPayload = payload as T & { detail?: string; message?: string }
    throw new AppError(
      errorPayload.detail || errorPayload.message || 'Didit rechazo la solicitud',
      response.status,
    )
  }

  return payload
}

export async function createDiditDriverSession(params: CreateDiditSessionParams): Promise<DiditSessionResponse> {
  const { workflowId, baseUrl } = getDiditConfig()
  const response = await fetch(`${baseUrl}/session/`, {
    method: 'POST',
    headers: buildDiditHeaders(),
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: params.vendorData,
      callback: params.callbackUrl,
      metadata: params.metadata,
      contact_details: params.phone ? { phone: params.phone } : undefined,
    }),
  })

  return parseDiditResponse<DiditSessionResponse>(response)
}

export async function getDiditSessionDecision(sessionId: string): Promise<DiditSessionResponse> {
  const { baseUrl } = getDiditConfig()
  const response = await fetch(`${baseUrl}/session/${sessionId}/decision/`, {
    method: 'GET',
    headers: buildDiditHeaders(),
  })

  return parseDiditResponse<DiditSessionResponse>(response)
}

export function mapDiditStatus(status: DiditSessionStatus): DriverVerificationStatus {
  switch (status) {
    case 'Not Started':
      return 'PENDING'
    case 'In Progress':
    case 'Awaiting User':
      return 'IN_PROGRESS'
    case 'In Review':
      return 'IN_REVIEW'
    case 'Approved':
      return 'APPROVED'
    case 'Declined':
      return 'DECLINED'
    case 'Resubmitted':
      return 'RESUBMITTED'
    case 'Expired':
      return 'EXPIRED'
    case 'Abandoned':
      return 'ABANDONED'
    case 'Kyc Expired':
      return 'KYC_EXPIRED'
    default:
      return 'PENDING'
  }
}

export function driverVerificationNote(status: DriverVerificationStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'Verificacion aprobada por Didit.'
    case 'DECLINED':
      return 'Didit rechazo la verificacion. Debes iniciar una nueva sesion.'
    case 'IN_REVIEW':
      return 'Didit envio la verificacion a revision manual.'
    case 'RESUBMITTED':
      return 'Didit pidio que repitas parte del proceso.'
    case 'EXPIRED':
      return 'La sesion de Didit vencio antes de completarse.'
    case 'ABANDONED':
      return 'La sesion de Didit quedo incompleta.'
    case 'KYC_EXPIRED':
      return 'La verificacion de conductor vencio y debe renovarse.'
    case 'IN_PROGRESS':
      return 'Didit todavia esta procesando la verificacion.'
    case 'PENDING':
      return 'La sesion de Didit esta creada y lista para iniciarse.'
    default:
      return 'Aun no iniciaste la verificacion de conductor.'
  }
}

export function buildDriverVerificationUpdate(payload: DiditSessionResponse): Prisma.UserUpdateInput {
  const status = mapDiditStatus(payload.status)
  const isApproved = status === 'APPROVED'
  const isTerminalFailure = status === 'DECLINED' || status === 'EXPIRED' || status === 'ABANDONED' || status === 'KYC_EXPIRED'

  return {
    driverVerificationStatus: status,
    driverVerificationSessionId: payload.session_id,
    driverVerificationUrl: payload.url ?? undefined,
    driverVerificationCheckedAt: new Date(),
    driverVerificationDecision: payload.decision
      ? payload.decision as Prisma.InputJsonValue
      : Prisma.JsonNull,
    driverVerificationNotes: driverVerificationNote(status),
    driverVerifiedAt: isApproved ? new Date() : isTerminalFailure ? null : undefined,
    isVerified: isApproved ? true : isTerminalFailure ? false : undefined,
  }
}

export function buildBypassedDriverVerificationUpdate(userId: string): Prisma.UserUpdateInput {
  return {
    driverVerificationStatus: 'APPROVED',
    driverVerificationSessionId: `bypass-${userId}`,
    driverVerificationUrl: null,
    driverVerificationSubmittedAt: new Date(),
    driverVerificationCheckedAt: new Date(),
    driverVerificationNotes: 'Verificacion de Didit omitida temporalmente por configuracion local.',
    driverVerificationDecision: Prisma.JsonNull,
    driverVerifiedAt: new Date(),
    isVerified: true,
  }
}

function sortKeysRecursive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysRecursive)
  if (!value || typeof value !== 'object') return value

  const input = value as Record<string, unknown>
  return Object.keys(input)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortKeysRecursive(input[key])
      return acc
    }, {})
}

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shortenFloats)
  if (!value || typeof value !== 'object') return value

  const input = value as Record<string, unknown>
  return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (typeof entry === 'number' && Number.isInteger(entry)) {
      acc[key] = entry
      return acc
    }

    acc[key] = shortenFloats(entry)
    return acc
  }, {})
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  if (expectedBuffer.length !== actualBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

function hmacHex(secret: string, value: string): string {
  return crypto.createHmac('sha256', secret).update(value, 'utf8').digest('hex')
}

function validateWebhookTimestamp(timestampHeader?: string | null): void {
  if (!timestampHeader) throw new AppError('Falta X-Timestamp en el webhook de Didit', 401)
  const timestamp = Number(timestampHeader)
  if (!Number.isFinite(timestamp)) throw new AppError('X-Timestamp invalido en el webhook de Didit', 401)
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) {
    throw new AppError('Webhook de Didit vencido o fuera de ventana', 401)
  }
}

export function verifyDiditWebhook(
  rawBody: string,
  headers: DiditWebhookHeaders,
  webhookSecret: string,
): VerifiedDiditWebhook {
  validateWebhookTimestamp(headers.timestamp)

  let parsedBody: Record<string, unknown>
  try {
    parsedBody = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    throw new AppError('Payload invalido en el webhook de Didit', 400)
  }

  if (headers.signatureV2) {
    const canonical = JSON.stringify(sortKeysRecursive(shortenFloats(parsedBody)))
    if (safeCompare(headers.signatureV2, hmacHex(webhookSecret, canonical))) {
      return { payload: parsedBody, trustedDecision: true }
    }
  }

  if (headers.signature && safeCompare(headers.signature, hmacHex(webhookSecret, rawBody))) {
    return { payload: parsedBody, trustedDecision: true }
  }

  if (headers.signatureSimple) {
    const canonical = [
      String(parsedBody.timestamp ?? ''),
      String(parsedBody.session_id ?? ''),
      String(parsedBody.status ?? ''),
      String(parsedBody.webhook_type ?? ''),
    ].join(':')

    if (safeCompare(headers.signatureSimple, hmacHex(webhookSecret, canonical))) {
      return { payload: parsedBody, trustedDecision: false }
    }
  }

  throw new AppError('Firma invalida en el webhook de Didit', 401)
}
