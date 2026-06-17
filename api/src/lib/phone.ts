import { AppError } from '../middleware/errorHandler'

const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/

function sanitizedCountryCode(value: string): string {
  const normalized = value.trim().replace(/[^\d+]/g, '')
  if (!normalized.startsWith('+')) {
    throw new AppError('PHONE_DEFAULT_COUNTRY_CODE debe incluir el prefijo internacional, por ejemplo +54', 500)
  }

  return normalized
}

export function normalizePhoneNumber(rawPhone: string): string {
  const phone = rawPhone.trim()
  if (!phone) throw new AppError('Telefono requerido', 400)

  if (phone.startsWith('+')) {
    const normalized = `+${phone.slice(1).replace(/\D/g, '')}`
    if (!E164_PHONE_REGEX.test(normalized)) {
      throw new AppError('Telefono invalido. Usa formato internacional, por ejemplo +5491112345678.', 400)
    }
    return normalized
  }

  const defaultCountryCode = process.env.PHONE_DEFAULT_COUNTRY_CODE?.trim()
  if (!defaultCountryCode) {
    throw new AppError('Ingresa el telefono en formato internacional, por ejemplo +5491112345678.', 400)
  }

  const digits = phone.replace(/\D/g, '')
  if (!digits) throw new AppError('Telefono invalido', 400)

  const normalized = `${sanitizedCountryCode(defaultCountryCode)}${digits}`
  if (!E164_PHONE_REGEX.test(normalized)) {
    throw new AppError('Telefono invalido. Revisa el codigo de pais y el numero.', 400)
  }

  return normalized
}
