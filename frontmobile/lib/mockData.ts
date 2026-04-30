export type Driver = {
  id: string
  name: string
  initials: string
  rating: number
  ratingCount: number
  isVerified: boolean
}

export type Trip = {
  id: string
  driver: Driver
  originCity: string
  destinationCity: string
  departureDate: string
  availableSeats: number
  pricePerSeat: number
  availableKg: number
  pricePerKg: number
  notes?: string
  status: 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

export type MyRequest = {
  id: string
  trip: Trip
  type: 'passenger' | 'package'
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'
  seats?: number
  weightKg?: number
  message?: string
}

export const MOCK_TRIPS: Trip[] = [
  {
    id: '1',
    driver: { id: 'u1', name: 'Martín García', initials: 'MG', rating: 4.8, ratingCount: 34, isVerified: true },
    originCity: 'Mercedes',
    destinationCity: 'Buenos Aires',
    departureDate: '2026-04-28T07:00:00',
    availableSeats: 2,
    pricePerSeat: 8000,
    availableKg: 15,
    pricePerKg: 500,
    notes: 'Salgo del centro de Mercedes, paso por la autopista 5. Puntual.',
    status: 'OPEN',
  },
  {
    id: '2',
    driver: { id: 'u2', name: 'Laura Sánchez', initials: 'LS', rating: 5.0, ratingCount: 12, isVerified: true },
    originCity: 'Mercedes',
    destinationCity: 'Buenos Aires',
    departureDate: '2026-04-28T08:30:00',
    availableSeats: 1,
    pricePerSeat: 7500,
    availableKg: 20,
    pricePerKg: 400,
    notes: 'Paso por Luján si es de camino.',
    status: 'OPEN',
  },
  {
    id: '3',
    driver: { id: 'u3', name: 'Carlos Romero', initials: 'CR', rating: 4.6, ratingCount: 58, isVerified: false },
    originCity: 'Luján',
    destinationCity: 'Buenos Aires',
    departureDate: '2026-04-29T06:00:00',
    availableSeats: 3,
    pricePerSeat: 6000,
    availableKg: 30,
    pricePerKg: 350,
    status: 'OPEN',
  },
  {
    id: '4',
    driver: { id: 'u4', name: 'Ana Fernández', initials: 'AF', rating: 4.9, ratingCount: 21, isVerified: true },
    originCity: 'Chacabuco',
    destinationCity: 'Buenos Aires',
    departureDate: '2026-04-29T07:30:00',
    availableSeats: 2,
    pricePerSeat: 10000,
    availableKg: 10,
    pricePerKg: 600,
    notes: 'Auto grande, cómodo para viajes largos.',
    status: 'OPEN',
  },
]

export const MOCK_MY_TRIPS: Trip[] = [
  {
    id: '5',
    driver: { id: 'me', name: 'Vos', initials: 'TU', rating: 4.7, ratingCount: 8, isVerified: true },
    originCity: 'Mercedes',
    destinationCity: 'Buenos Aires',
    departureDate: '2026-04-28T07:00:00',
    availableSeats: 2,
    pricePerSeat: 8000,
    availableKg: 15,
    pricePerKg: 500,
    status: 'OPEN',
  },
]

export const MOCK_MY_REQUESTS: MyRequest[] = [
  {
    id: 'r1',
    trip: MOCK_TRIPS[0],
    type: 'passenger',
    status: 'ACCEPTED',
    seats: 1,
  },
  {
    id: 'r2',
    trip: MOCK_TRIPS[2],
    type: 'package',
    status: 'PENDING',
    weightKg: 5,
    message: 'Caja de ropa, no frágil.',
  },
]

export const MOCK_REVIEWS = [
  { id: 'rev1', fromName: 'Paula M.', rating: 5, comment: 'Excelente viajero, puntual y muy amable.' },
  { id: 'rev2', fromName: 'Rodrigo K.', rating: 5, comment: 'El paquete llegó perfecto, muy recomendable.' },
  { id: 'rev3', fromName: 'Sofía L.', rating: 4, comment: 'Buen viaje, llegamos a tiempo.' },
]
