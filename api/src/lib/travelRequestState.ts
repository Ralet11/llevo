import type { TravelRequestStatus } from '@prisma/client'

export const ACTIVE_TRAVEL_REQUEST_STATUSES = ['SEARCHING', 'PUBLISHED', 'MATCHED', 'CONFIRMED'] as const satisfies readonly TravelRequestStatus[]

const transitions: Record<TravelRequestStatus, readonly TravelRequestStatus[]> = {
  SEARCHING: ['PUBLISHED', 'MATCHED', 'CANCELLED', 'EXPIRED'],
  PUBLISHED: ['MATCHED', 'CANCELLED', 'EXPIRED'],
  MATCHED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
}

export function canTransitionTravelRequest(from: TravelRequestStatus, to: TravelRequestStatus): boolean {
  return transitions[from].includes(to)
}

export function assertTravelRequestTransition(from: TravelRequestStatus, to: TravelRequestStatus): void {
  if (!canTransitionTravelRequest(from, to)) {
    throw new Error(`No se puede pasar una solicitud de viaje de ${from} a ${to}`)
  }
}

export function isActiveTravelRequestStatus(status: TravelRequestStatus): boolean {
  return (ACTIVE_TRAVEL_REQUEST_STATUSES as readonly TravelRequestStatus[]).includes(status)
}
