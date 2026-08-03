export type ShipmentPriceInput = {
  distanceKm: number
  durationMin: number
  weightKg: number
  packageSize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'BULKY'
}

const SIZE_SURCHARGES = { SMALL: 0, MEDIUM: 500, LARGE: 1200, BULKY: 2500 } as const

function envAmount(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export function quoteShipment(input: ShipmentPriceInput) {
  const distanceKm = Math.max(0.5, Math.min(input.distanceKm, 3000))
  const durationMin = Math.max(5, Math.min(Math.round(input.durationMin), 4320))
  const weightKg = Math.max(0.1, Math.min(input.weightKg, 10000))
  const baseFee = envAmount('SHIPMENT_BASE_FEE', 1500)
  const distanceFee = Math.round(distanceKm * envAmount('SHIPMENT_PRICE_PER_KM', 600))
  const timeFee = Math.round(durationMin * envAmount('SHIPMENT_PRICE_PER_MINUTE', 35))
  const weightFee = Math.round(weightKg * envAmount('SHIPMENT_PRICE_PER_KG', 250))
  const sizeSurcharge = envAmount(`SHIPMENT_SIZE_SURCHARGE_${input.packageSize}`, SIZE_SURCHARGES[input.packageSize])
  const subtotal = baseFee + distanceFee + timeFee + weightFee + sizeSurcharge
  const platformFee = Math.round(subtotal * envAmount('PLATFORM_FEE_PERCENT', 12) / 100)
  return { distanceKm, durationMin, baseFee, distanceFee, timeFee, weightFee, sizeSurcharge, platformFee, total: subtotal + platformFee }
}
