import {
  AsYouType,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

/**
 * Utilidades de telefono. La verdad que viaja al backend / Twilio es SIEMPRE
 * E.164 (`+<codigo pais><numero>`). El usuario escribe el numero nacional y elige
 * el pais por separado; aca lo combinamos y validamos.
 */

export function callingCode(iso2: string): string {
  try {
    return `+${getCountryCallingCode(iso2 as CountryCode)}`
  } catch {
    return ''
  }
}

/** Normaliza el numero nacional + pais a E.164, o null si no es valido. */
export function toE164(nationalNumber: string, iso2: string): string | null {
  const trimmed = nationalNumber.trim()
  if (!trimmed) return null
  const parsed = parsePhoneNumberFromString(trimmed, iso2 as CountryCode)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number // formato E.164
}

/** True si el numero nacional es valido para ese pais. */
export function isValidNationalNumber(nationalNumber: string, iso2: string): boolean {
  const trimmed = nationalNumber.trim()
  if (!trimmed) return false
  try {
    return isValidPhoneNumber(trimmed, iso2 as CountryCode)
  } catch {
    return false
  }
}

/** Formatea mientras se escribe, para mostrarlo prolijo en el input. */
export function formatAsYouType(nationalNumber: string, iso2: string): string {
  try {
    return new AsYouType(iso2 as CountryCode).input(nationalNumber)
  } catch {
    return nationalNumber
  }
}

/**
 * Si recibimos un valor que ya parece E.164 (empieza con +), intenta deducir el
 * pais y el numero nacional para precargar el campo (ej: editar telefono guardado).
 */
export function splitE164(value: string): { iso2?: string; national: string } {
  const parsed = parsePhoneNumberFromString(value.trim())
  if (!parsed) return { national: value.trim() }
  return {
    iso2: parsed.country,
    national: parsed.nationalNumber.toString(),
  }
}
