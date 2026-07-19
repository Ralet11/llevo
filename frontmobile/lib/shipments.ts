import { api } from './api'

export type ShipmentStatus = 'SEARCHING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED' | 'NO_COVERAGE'
export type PackageSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'BULKY'

export type MyShipmentDriver = {
  id: string
  name: string
  avatarUrl: string | null
  rating: number | null
}

export type MyShipment = {
  id: string
  originCity: string
  destinationCity: string
  originAddress: string
  deliveryAddress: string
  weightKg: number
  packageSize: PackageSize
  recipientDetails: string
  status: ShipmentStatus
  preferredDate: string | null
  createdAt: string
  job: { driver: MyShipmentDriver } | null
}

const ACTIVE_STATUSES: ShipmentStatus[] = ['SEARCHING', 'ASSIGNED', 'PICKED_UP']

export function fetchMyShipments(token: string) {
  return api.get<{ shipments: MyShipment[] }>('/shipments/mine', token).then(data => data.shipments)
}

export function fetchShipment(token: string, shipmentId: string) {
  return api.get<{ shipment: MyShipment }>(`/shipments/${shipmentId}`, token).then(data => data.shipment)
}

export function cancelShipment(token: string, shipmentId: string) {
  return api.post<{ ok: boolean }>(`/shipments/${shipmentId}/cancel`, {}, token)
}

export function isActiveShipmentStatus(status: ShipmentStatus) {
  return ACTIVE_STATUSES.includes(status)
}
