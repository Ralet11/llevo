import { api } from './api'

export type TripDriver = {
  id: string
  name: string
  avatarUrl: string | null
  rating: number
  ratingCount: number
  isIdentityVerified: boolean
}

export type TripVehicle = { type: string; model: string | null; seats: number }

export type TripOption = {
  routeId: string
  date: string
  originCity: string
  destinationCity: string
  waypointCities: string[]
  departureTimeFrom: string | null
  departureTimeTo: string | null
  pricePerSeat: number | null
  seatsOffered: number
  seatsFree: number
  driver: TripDriver
  vehicle: TripVehicle | null
}

export type TripSearchResult = {
  sameCity: boolean
  options: TripOption[]
}

export function searchTrips(
  token: string,
  params: { originCity: string; destinationCity: string; dateISO: string },
) {
  const q = new URLSearchParams({
    originCity: params.originCity,
    destinationCity: params.destinationCity,
    date: params.dateISO,
  }).toString()
  return api.get<TripSearchResult>(`/trips/search?${q}`, token)
}

// ─── Reservas de pasajero ────────────────────────────────────────────────────

export type RideBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED'

export type MyBooking = {
  id: string
  date: string
  seats: number
  originCity: string
  destinationCity: string
  pricePerSeat: number | null
  status: RideBookingStatus
  createdAt: string
  route: {
    originCity: string
    destinationCity: string
    departureTimeFrom: string | null
    departureTimeTo: string | null
    driver: { id: string; name: string; avatarUrl: string | null; rating: number; ratingCount: number }
  }
}

export type RideRequest = {
  id: string
  date: string
  seats: number
  originCity: string
  destinationCity: string
  pricePerSeat: number | null
  status: RideBookingStatus
  createdAt: string
  route: { id: string; originCity: string; destinationCity: string; departureTimeFrom: string | null }
  passenger: { id: string; name: string; avatarUrl: string | null; rating: number; ratingCount: number }
}

export function createBooking(
  token: string,
  params: { routeId: string; dateISO: string; seats: number; originCity: string; destinationCity: string },
) {
  return api.post<{ booking: { id: string } }>('/trips/book', {
    routeId: params.routeId,
    date: params.dateISO,
    seats: params.seats,
    originCity: params.originCity,
    destinationCity: params.destinationCity,
  }, token)
}

export function fetchMyBookings(token: string) {
  return api.get<{ bookings: MyBooking[] }>('/trips/bookings/mine', token).then(d => d.bookings)
}

export function fetchRideRequests(token: string) {
  return api.get<{ bookings: RideRequest[] }>('/trips/ride-requests', token).then(d => d.bookings)
}

export function respondBooking(token: string, id: string, action: 'approve' | 'reject') {
  return api.post<{ ok: boolean; status: RideBookingStatus }>(`/trips/bookings/${id}/respond`, { action }, token)
}

export function cancelBooking(token: string, id: string) {
  return api.post<{ ok: boolean }>(`/trips/bookings/${id}/cancel`, {}, token)
}
