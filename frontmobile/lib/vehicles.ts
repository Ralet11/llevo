import { api } from './api'

export type VehicleType = 'MOTO' | 'AUTO' | 'CAMIONETA' | 'CAMION'

export type Vehicle = {
  id: string
  type: VehicleType
  licensePlate: string | null
  model: string | null
  color: string | null
  seats: number
  isActive: boolean
  createdAt: string
}

export type VehicleInput = {
  type: VehicleType
  licensePlate?: string
  model?: string
  color?: string
  seats: number
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  MOTO: 'Moto', AUTO: 'Auto', CAMIONETA: 'Camioneta', CAMION: 'Camión',
}

export function fetchVehicles(token: string) {
  return api.get<{ vehicles: Vehicle[] }>('/drivers/vehicles', token).then(d => d.vehicles)
}

export function createVehicle(token: string, data: VehicleInput) {
  return api.post<{ vehicle: Vehicle }>('/drivers/vehicles', data, token).then(d => d.vehicle)
}

export function updateVehicle(token: string, id: string, data: Partial<VehicleInput>) {
  return api.patch<{ vehicle: Vehicle }>(`/drivers/vehicles/${id}`, data, token).then(d => d.vehicle)
}

export function deleteVehicle(token: string, id: string) {
  return api.delete<{ ok: boolean }>(`/drivers/vehicles/${id}`, token)
}
