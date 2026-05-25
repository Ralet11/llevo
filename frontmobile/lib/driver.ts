import { Ionicons } from '@expo/vector-icons'
import type { DriverMode } from './auth'

type IconName = React.ComponentProps<typeof Ionicons>['name']

export type DriverModeMeta = {
  label: string
  subtitle: string
  icon: IconName
  setupTitle: string
  setupDescription: string
  vehicleLabel: string
  vehiclePlaceholder: string
  coverageLabel: string
  coveragePlaceholder: string
  availabilityLabel: string
  availabilityPlaceholder: string
}

export const DRIVER_MODE_OPTIONS: DriverMode[] = ['rider', 'viajes', 'entrega']

export const DRIVER_MODE_META: Record<DriverMode, DriverModeMeta> = {
  rider: {
    label: 'Rider',
    subtitle: 'Recados rapidos, tramites y traslados cortos',
    icon: 'bicycle',
    setupTitle: 'Prepara tu perfil rider',
    setupDescription: 'Define con que te mueves y en que zona vas a tomar pedidos.',
    vehicleLabel: 'Vehiculo principal',
    vehiclePlaceholder: 'Moto 110, bici o utilitario',
    coverageLabel: 'Zona de trabajo',
    coveragePlaceholder: 'Caballito, Almagro, Centro',
    availabilityLabel: 'Disponibilidad',
    availabilityPlaceholder: 'Lunes a viernes de 8 a 18 hs',
  },
  viajes: {
    label: 'Viajes',
    subtitle: 'Publicar asientos, rutas y viajes compartidos',
    icon: 'car-sport',
    setupTitle: 'Configura tu perfil para viajes',
    setupDescription: 'Cuida el punto de partida, el vehiculo y tu franja disponible.',
    vehicleLabel: 'Vehiculo para viajes',
    vehiclePlaceholder: 'Auto, SUV o van',
    coverageLabel: 'Ruta o base principal',
    coveragePlaceholder: 'CABA - Lujan - Zona Oeste',
    availabilityLabel: 'Frecuencia de salida',
    availabilityPlaceholder: 'Todos los dias a la manana',
  },
  entrega: {
    label: 'Entrega',
    subtitle: 'Paquetes, encomiendas y distancias largas',
    icon: 'cube',
    setupTitle: 'Configura tu perfil de entregas',
    setupDescription: 'Aclara tu capacidad y el alcance de cobertura antes de salir.',
    vehicleLabel: 'Vehiculo o capacidad',
    vehiclePlaceholder: 'Utilitario, camioneta o baul amplio',
    coverageLabel: 'Cobertura de entrega',
    coveragePlaceholder: 'AMBA, corredor norte, interior',
    availabilityLabel: 'Ventanas de retiro',
    availabilityPlaceholder: 'Retiro en el dia hasta las 20 hs',
  },
}

export function getDriverModeMeta(mode: DriverMode) {
  return DRIVER_MODE_META[mode]
}
