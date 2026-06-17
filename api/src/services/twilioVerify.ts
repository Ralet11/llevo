import { AppError } from '../middleware/errorHandler'

type TwilioVerifyResponse = {
  sid?: string
  status?: string
  valid?: boolean
  message?: string
  detail?: string
}

type SendVerificationParams = {
  phone: string
}

type CheckVerificationParams = {
  phone: string
  code: string
}

function getTwilioCredentials() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  if (!serviceSid) {
    throw new AppError('Falta TWILIO_VERIFY_SERVICE_SID en el backend', 500)
  }

  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim()
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim()
  if (apiKeySid && apiKeySecret) {
    return { serviceSid, username: apiKeySid, password: apiKeySecret }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (accountSid && authToken) {
    return { serviceSid, username: accountSid, password: authToken }
  }

  throw new AppError(
    'Configura credenciales de Twilio. Usa TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET o TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.',
    500,
  )
}

async function callTwilioVerify(
  path: string,
  formData: Record<string, string>,
): Promise<TwilioVerifyResponse> {
  const { serviceSid, username, password } = getTwilioCredentials()
  const body = new URLSearchParams(formData)
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) as TwilioVerifyResponse : {}

  if (!response.ok) {
    throw new AppError(payload.message || payload.detail || 'Twilio Verify rechazo la solicitud', response.status)
  }

  return payload
}

export async function sendPhoneVerificationCode({ phone }: SendVerificationParams): Promise<void> {
  const channel = process.env.TWILIO_VERIFY_CHANNEL?.trim() || 'sms'
  const payload = await callTwilioVerify('/Verifications', {
    To: phone,
    Channel: channel,
  })

  if (!payload.sid || payload.status !== 'pending') {
    throw new AppError('Twilio no pudo iniciar la verificacion del telefono', 502)
  }
}

export async function checkPhoneVerificationCode({ phone, code }: CheckVerificationParams): Promise<void> {
  const payload = await callTwilioVerify('/VerificationCheck', {
    To: phone,
    Code: code,
  })

  if (payload.status !== 'approved' || payload.valid !== true) {
    throw new AppError('Codigo invalido o vencido', 400)
  }
}
