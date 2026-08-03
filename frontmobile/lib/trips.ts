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

export type TravelRequestStatus = 'SEARCHING' | 'PUBLISHED' | 'MATCHED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'

export type TravelRequest = {
  id: string
  originCity: string
  destinationCity: string
  date: string
  seats: number
  status: TravelRequestStatus
  searchDeadline: string
  publishedAt: string | null
  createdAt: string
  matchedRoute: { id: string; originCity: string; destinationCity: string; departureTimeFrom: string | null; departureTimeTo: string | null } | null
  booking: { id: string; status: RideBookingStatus } | null
}

export function createTravelRequest(
  token: string,
  params: { originCity: string; destinationCity: string; dateISO: string; seats?: number },
) {
  return api.post<{ travelRequest: TravelRequest; candidateCount: number }>('/trips/travel-requests', {
    originCity: params.originCity,
    destinationCity: params.destinationCity,
    date: params.dateISO,
    seats: params.seats ?? 1,
  }, token)
}

export function createRouteAlert(token: string, params: { originCity: string; destinationCity: string; dateISO: string }) {
  return api.post<{ alert: { id: string } }>('/trips/route-alerts', {
    originCity: params.originCity,
    destinationCity: params.destinationCity,
    date: params.dateISO,
  }, token)
}

export type RouteAlert = {
  id: string
  originCity: string
  destinationCity: string
  date: string
  notifiedAt: string | null
  createdAt: string
}

export function fetchMyRouteAlerts(token: string) {
  return api.get<{ alerts: RouteAlert[] }>('/trips/route-alerts/mine', token).then(data => data.alerts)
}

export function cancelRouteAlert(token: string, id: string) {
  return api.delete<{ ok: true }>(`/trips/route-alerts/${id}`, token)
}

export function fetchMyTravelRequests(token: string) {
  return api.get<{ travelRequests: TravelRequest[] }>('/trips/travel-requests/mine', token).then(data => data.travelRequests)
}

export function cancelTravelRequest(token: string, id: string) {
  return api.post<{ travelRequest: TravelRequest }>(`/trips/travel-requests/${id}/cancel`, {}, token)
}

export type DriverTravelOpportunity = {
  id: string
  route: { id: string; originCity: string; destinationCity: string; departureTimeFrom: string | null; departureTimeTo: string | null }
  travelRequest: Pick<TravelRequest, 'id' | 'originCity' | 'destinationCity' | 'date' | 'seats' | 'status' | 'searchDeadline' | 'publishedAt' | 'createdAt'>
}

export function fetchDriverTravelOpportunities(token: string) {
  return api.get<{ opportunities: DriverTravelOpportunity[] }>('/trips/travel-requests/opportunities', token).then(data => data.opportunities)
}

export function respondToTravelRequest(token: string, id: string, action: 'accept' | 'reject') {
  return api.post<{ ok: boolean }>(`/trips/travel-requests/${id}/respond`, { action }, token)
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

export function createRideCheckout(token: string, id: string) {
  return api.post<{ checkoutUrl: string; paymentId: string }>(`/payments/ride-bookings/${id}/checkout`, {}, token)
}
