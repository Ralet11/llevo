import { Ionicons } from '@expo/vector-icons'
import { Href, router, usePathname, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Calendar } from 'react-native-calendars'
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppDrawer } from '../../components/app/AppDrawer'
import { HomeDashboard } from '../../components/app/home/HomeDashboard'
import { IconButton } from '../../components/ui/IconButton'
import { darkMapStyle } from '../../constants/mapStyle'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { api, ApiError } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { fetchMyRouteAlerts, type RouteAlert } from '../../lib/trips'
import { cancelShipment, fetchMyShipments, isActiveShipmentStatus, type MyShipment, type PackageSize } from '../../lib/shipments'
import {
  autocompletePlaces,
  computeRoutePreview,
  decodePolyline,
  type PlaceSuggestion,
  type RoutePreview,
} from '../../lib/maps'
import {
  DEFAULT_MAP_REGION,
  getAddressLabel,
  getForegroundPermissionStatus,
  getInitialMapRegion,
  watchUserLocation,
} from '../../lib/location'

type MapStatus = 'loading' | 'device' | 'permission_denied' | 'services_off' | 'error'
type IconName = React.ComponentProps<typeof Ionicons>['name']
type ServiceMode = 'moto' | 'viaje' | 'entrega'
type SearchStage = 'idle' | 'editing' | 'results' | 'delivery_tracking'
type SearchReturnStage = 'idle' | 'results'
type SearchField = 'origin' | 'destination'
type RouteOfferId = 'economico' | 'moto' | 'grupo'
type DeliveryPackageSize = 'small' | 'medium' | 'large' | 'bulky'
type DeliveryRequestStatus = 'idle' | 'searching' | 'accepted' | 'picked_up' | 'delivered' | 'no_coverage'
type DeliveryWizardStep = 'route' | 'package' | 'contacts'

type RouteOffer = {
  id: RouteOfferId
  title: string
  subtitle: string
  eta: string
  price: number
  icon: IconName
  seatsLabel: string
  marker: LatLng
}

type SearchResult = {
  source: 'live' | 'fallback'
  originLabel: string
  destinationLabel: string
  originCity: string | null
  destinationCity: string | null
  durationLabel: string
  distanceLabel: string
  distanceMeters: number
  durationSeconds: number
  routeCoordinates: LatLng[]
  originPoint: LatLng
  destinationPoint: LatLng
  offers: RouteOffer[]
}

type PlacePreset = {
  id: string
  label: string
  latitude: number
  longitude: number
  aliases: string[]
}

type DeliveryDraft = {
  estimatedWeight: string
  estimatedSize: DeliveryPackageSize | null
  notes: string
  deliveryAddress: string
  deliveryDetails: string
  declarationAccepted: boolean
  preferredDate: string | null // YYYY-MM-DD, null = envío inmediato
}

type AssignedDriver = {
  id: string | null
  name: string
  phone: string | null
  rating: number | null
  ratingCount: number
}

type ShipmentQuote = {
  baseFee: number
  distanceFee: number
  timeFee: number
  weightFee: number
  sizeSurcharge: number
  platformFee: number
  total: number
}

const MAP_MARKERS = [
  { id: 'moto-1', title: 'Rider disponible', latitude: -34.6032, longitude: -58.3813, icon: 'bicycle' as IconName, category: 'moto' as ServiceMode },
  { id: 'viaje-1', title: 'Viaje compartido', latitude: -34.6005, longitude: -58.3862, icon: 'car-sport' as IconName, category: 'viaje' as ServiceMode },
  { id: 'entrega-1', title: 'Entrega larga distancia', latitude: -34.6075, longitude: -58.379, icon: 'cube' as IconName, category: 'entrega' as ServiceMode },
]

const PLACE_PRESETS: PlacePreset[] = [
  {
    id: 'diaz-velez',
    label: 'Av. Diaz Velez 3916',
    latitude: -34.6104,
    longitude: -58.4267,
    aliases: ['diaz velez', 'av diaz velez 3916', 'caballito'],
  },
  {
    id: 'once',
    label: 'Plaza Miserere',
    latitude: -34.6097,
    longitude: -58.4098,
    aliases: ['once', 'plaza miserere'],
  },
  {
    id: 'obelisco',
    label: 'Obelisco',
    latitude: -34.6037,
    longitude: -58.3816,
    aliases: ['obelisco', 'centro', 'microcentro'],
  },
  {
    id: 'portal-lujan',
    label: 'Portal Lujan',
    latitude: -34.5679,
    longitude: -59.1044,
    aliases: ['portal', 'lujan', 'portal lujan'],
  },
  {
    id: 'aeroparque',
    label: 'Aeroparque',
    latitude: -34.5592,
    longitude: -58.4156,
    aliases: ['aeroparque', 'jorge newbery'],
  },
  {
    id: 'moron',
    label: 'Moron centro',
    latitude: -34.6521,
    longitude: -58.6198,
    aliases: ['moron', 'moron centro'],
  },
]

const QUICK_DESTINATIONS = PLACE_PRESETS.slice(1)
const DELIVERY_SIZE_OPTIONS: {
  id: DeliveryPackageSize
  label: string
  subtitle: string
}[] = [
  { id: 'small', label: 'Sobre', subtitle: 'Documentos o piezas chicas' },
  { id: 'medium', label: 'Bolso', subtitle: 'Mochila o caja chica' },
  { id: 'large', label: 'Caja', subtitle: 'Volumen medio' },
  { id: 'bulky', label: 'Grande', subtitle: 'Valija o bulto grande' },
]

const DELIVERY_WIZARD_STEPS: {
  id: DeliveryWizardStep
  label: string
  title: string
  subtitle: string
  cta: string
}[] = [
  {
    id: 'route',
    label: 'Ruta',
    title: 'Retiro y destino',
    subtitle: 'Defini desde donde sale el paquete y a donde lo enviamos.',
    cta: 'Continuar',
  },
  {
    id: 'package',
    label: 'Paquete',
    title: 'Detalles del paquete',
    subtitle: 'Cargamos peso, tamano y referencias para asignar mejor el viaje.',
    cta: 'Continuar',
  },
  {
    id: 'contacts',
    label: 'Entrega',
    title: 'Datos de recepcion',
    subtitle: 'Quien recibe el paquete y como contactarlos.',
    cta: 'Buscar conductor',
  },
]

const EMPTY_DELIVERY_DRAFT: DeliveryDraft = {
  estimatedWeight: '',
  estimatedSize: null,
  notes: '',
  deliveryAddress: '',
  deliveryDetails: '',
  declarationAccepted: false,
  preferredDate: null,
}


function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatDurationMinutes(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

function formatDurationSeconds(totalSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60))
  return formatDurationMinutes(totalMinutes)
}

function formatDistance(distanceMeters: number) {
  const distanceKm = distanceMeters / 1000
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceMeters))} m`
  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km`
}

function formatPrice(price: number) {
  return `ARS ${Math.round(price).toLocaleString('es-AR')}`
}

function getDeliverySizeLabel(size: DeliveryPackageSize | null) {
  return DELIVERY_SIZE_OPTIONS.find(option => option.id === size)?.label || 'Sin definir'
}

function formatDeliveryWeight(weight: string) {
  const normalized = weight.trim().replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return weight.trim()
  return `${parsed.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg`
}

function validateDeliveryRouteStep(destination: string) {
  if (!destination.trim()) return 'Ingresa a donde enviamos el paquete.'
  return null
}

function validateDeliveryPackageStep(draft: DeliveryDraft) {
  const parsedWeight = Number.parseFloat(draft.estimatedWeight.trim().replace(',', '.'))

  if (!draft.estimatedWeight.trim()) return 'Completa el peso estimado del paquete.'
  if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) return 'Ingresa un peso estimado valido.'
  if (!draft.estimatedSize) return 'Selecciona el tamano estimado del paquete.'

  return null
}

function validateDeliveryContactsStep(draft: DeliveryDraft) {
  if (!draft.deliveryDetails.trim()) return 'Agrega los datos de quien recibe el paquete.'
  if (!draft.declarationAccepted) return 'Acepta la declaracion jurada para continuar.'

  return null
}

// El backend exige un telefono de contacto para el retiro; las cuentas creadas
// por email/Google pueden no tener uno cargado todavia.
function validateSenderPhone(phone: string | null | undefined) {
  if (!phone || !phone.trim()) return 'Agrega tu telefono en tu perfil antes de enviar un paquete.'
  return null
}

function getPreferredDeliveryOfferId(size: DeliveryPackageSize | null): RouteOfferId {
  if (size === 'small' || size === 'medium') return 'moto'
  if (size === 'large' || size === 'bulky') return 'grupo'
  return 'economico'
}

function packageSizeToDeliverySize(size: PackageSize): DeliveryPackageSize {
  return size.toLowerCase() as DeliveryPackageSize
}

function shipmentStatusToTrackingStatus(status: MyShipment['status']): DeliveryRequestStatus {
  switch (status) {
    case 'SEARCHING': return 'searching'
    case 'ASSIGNED': return 'accepted'
    case 'PICKED_UP': return 'picked_up'
    case 'DELIVERED': return 'delivered'
    case 'NO_COVERAGE': return 'no_coverage'
    default: return 'searching'
  }
}

function validateDeliveryDraft(destination: string, draft: DeliveryDraft) {
  return (
    validateDeliveryRouteStep(destination) ??
    validateDeliveryPackageStep(draft) ??
    validateDeliveryContactsStep(draft)
  )
}

function getDeliveryWizardStartStep(destination: string, draft: DeliveryDraft): DeliveryWizardStep {
  if (validateDeliveryRouteStep(destination)) return 'route'
  if (validateDeliveryPackageStep(draft)) return 'package'
  return 'contacts'
}

function extractCity(label: string): string {
  const parts = label.split(',').map(s => s.trim()).filter(Boolean)
  return parts[0] ?? label
}

function toLatLng(region: Region): LatLng {
  return {
    latitude: region.latitude,
    longitude: region.longitude,
  }
}

function shiftCoordinate(point: LatLng, latitudeOffset: number, longitudeOffset: number): LatLng {
  return {
    latitude: point.latitude + latitudeOffset,
    longitude: point.longitude + longitudeOffset,
  }
}

function interpolateCoordinate(origin: LatLng, destination: LatLng, progress: number): LatLng {
  return {
    latitude: origin.latitude + (destination.latitude - origin.latitude) * progress,
    longitude: origin.longitude + (destination.longitude - origin.longitude) * progress,
  }
}

function getDistanceKm(origin: LatLng, destination: LatLng) {
  const latitudeKm = (destination.latitude - origin.latitude) * 111
  const longitudeKm =
    (destination.longitude - origin.longitude) *
    111 *
    Math.cos(((origin.latitude + destination.latitude) / 2) * (Math.PI / 180))

  return Math.sqrt(latitudeKm ** 2 + longitudeKm ** 2)
}

function buildRouteCoordinates(origin: LatLng, destination: LatLng) {
  const distance = getDistanceKm(origin, destination)
  const curve = Math.max(0.008, Math.min(0.038, distance * 0.00065))

  return [
    origin,
    {
      latitude: origin.latitude + (destination.latitude - origin.latitude) * 0.3 + curve,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * 0.28 - curve * 0.75,
    },
    {
      latitude: origin.latitude + (destination.latitude - origin.latitude) * 0.62 - curve * 0.45,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * 0.68 + curve * 0.45,
    },
    destination,
  ]
}

function createOffsetCoordinate(origin: LatLng, query: string): LatLng {
  const normalized = normalizeText(query) || 'destino'
  const seed = normalized.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0)
  const angle = (seed % 360) * (Math.PI / 180)
  const radius = 0.035 + (seed % 14) * 0.004

  return {
    latitude: clamp(origin.latitude + Math.cos(angle) * radius * 0.7, origin.latitude - 0.22, origin.latitude + 0.22),
    longitude: clamp(origin.longitude + Math.sin(angle) * radius, origin.longitude - 0.24, origin.longitude + 0.24),
  }
}

function resolvePointFromQuery(query: string, fallback: LatLng, currentAddressLabel: string) {
  const trimmed = query.trim()
  const normalized = normalizeText(trimmed)
  const normalizedCurrent = normalizeText(currentAddressLabel)

  if (!trimmed || normalized === normalizeText('mi ubicacion actual') || normalized === normalizedCurrent) {
    return {
      label: trimmed || currentAddressLabel,
      coordinate: fallback,
    }
  }

  const matched = PLACE_PRESETS.find(place =>
    place.aliases.some(alias => alias.includes(normalized) || normalized.includes(alias))
  )

  if (matched) {
    return {
      label: matched.label,
      coordinate: { latitude: matched.latitude, longitude: matched.longitude },
    }
  }

  return {
    label: toTitleCase(trimmed),
    coordinate: createOffsetCoordinate(fallback, trimmed),
  }
}

function buildOffers(routeCoordinates: LatLng[], originPoint: LatLng, destinationPoint: LatLng, distanceMeters: number, durationSeconds: number) {
  const distanceKm = Math.max(1, distanceMeters / 1000)
  const durationMinutes = Math.max(6, Math.round(durationSeconds / 60))
  const basePrice = Math.max(15950, Math.round(distanceKm * 1875 + 12900))
  const coordinateAt = (progress: number) => {
    const index = Math.min(routeCoordinates.length - 1, Math.max(0, Math.round((routeCoordinates.length - 1) * progress)))
    return routeCoordinates[index] ?? interpolateCoordinate(originPoint, destinationPoint, progress)
  }

  return [
    {
      id: 'economico',
      title: 'Viaje',
      subtitle: `${Math.max(3, Math.round(distanceKm / 9))} viajes economicos`,
      eta: `Llega en ${formatDurationMinutes(Math.max(22, durationMinutes - 12))}`,
      price: basePrice,
      icon: 'car-sport',
      seatsLabel: '4',
      marker: shiftCoordinate(coordinateAt(0.34), 0.011, -0.008),
    },
    {
      id: 'moto',
      title: 'Moto',
      subtitle: 'Sin trafico, precio bajo',
      eta: `Retiro en ${formatDurationMinutes(Math.max(8, Math.round(durationMinutes * 0.35)))}`,
      price: Math.max(6950, Math.round(basePrice * 0.34)),
      icon: 'bicycle',
      seatsLabel: '1',
      marker: shiftCoordinate(coordinateAt(0.58), -0.012, 0.006),
    },
    {
      id: 'grupo',
      title: '6 asientos',
      subtitle: 'Ideal para grupo o equipaje',
      eta: `Salida flexible ${formatDurationMinutes(Math.max(26, Math.round(durationMinutes * 0.85)))}`,
      price: Math.max(14950, Math.round(basePrice * 0.93)),
      icon: 'people',
      seatsLabel: '6',
      marker: shiftCoordinate(coordinateAt(0.78), 0.009, 0.01),
    },
  ] satisfies RouteOffer[]
}

function buildFallbackSearchResult(originQuery: string, destinationQuery: string, fallbackOrigin: LatLng, currentAddressLabel: string): SearchResult {
  const origin = resolvePointFromQuery(originQuery, fallbackOrigin, currentAddressLabel)
  const destination = resolvePointFromQuery(destinationQuery, origin.coordinate, currentAddressLabel)
  const routeCoordinates = buildRouteCoordinates(origin.coordinate, destination.coordinate)
  const distanceMeters = Math.max(4000, Math.round(getDistanceKm(origin.coordinate, destination.coordinate) * 1000))
  const durationSeconds = Math.max(18 * 60, Math.round((distanceMeters / 1000) * 3.2 * 60))

  return {
    source: 'fallback',
    originLabel: origin.label,
    destinationLabel: destination.label,
    originCity: null,
    destinationCity: null,
    durationLabel: formatDurationSeconds(durationSeconds),
    distanceLabel: formatDistance(distanceMeters),
    distanceMeters,
    durationSeconds,
    routeCoordinates,
    originPoint: origin.coordinate,
    destinationPoint: destination.coordinate,
    offers: buildOffers(routeCoordinates, origin.coordinate, destination.coordinate, distanceMeters, durationSeconds),
  }
}

function buildLiveSearchResult(route: RoutePreview): SearchResult {
  const routeCoordinates = decodePolyline(route.encodedPolyline)
  const normalizedRoute = routeCoordinates.length >= 2
    ? routeCoordinates
    : [route.origin.location, route.destination.location]

  return {
    source: 'live',
    originLabel: route.origin.formattedAddress || route.origin.label,
    destinationLabel: route.destination.formattedAddress || route.destination.label,
    originCity: route.origin.city,
    destinationCity: route.destination.city,
    durationLabel: formatDurationSeconds(route.durationSeconds),
    distanceLabel: formatDistance(route.distanceMeters),
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    routeCoordinates: normalizedRoute,
    originPoint: route.origin.location,
    destinationPoint: route.destination.location,
    offers: buildOffers(
      normalizedRoute,
      route.origin.location,
      route.destination.location,
      route.distanceMeters,
      route.durationSeconds
    ),
  }
}

function createSessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function isCurrentLocationQuery(value: string, currentLocationLabel: string) {
  const normalized = normalizeText(value)
  return !normalized || normalized === normalizeText('mi ubicacion actual') || normalized === normalizeText(currentLocationLabel)
}

function SearchMarker({
  icon,
  label,
  variant,
}: {
  icon: IconName
  label: string
  variant: 'origin' | 'destination' | 'offer'
}) {
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const containerStyle =
    variant === 'origin'
      ? styles.searchMarkerOrigin
      : variant === 'destination'
        ? styles.searchMarkerDestination
        : styles.searchMarkerOffer

  return (
    <View style={[styles.searchMarker, containerStyle]}>
      <Ionicons
        name={icon}
        size={variant === 'offer' ? 14 : 15}
        color={variant === 'destination' ? colors.black : colors.text}
      />
      {variant === 'offer' && <Text style={styles.searchMarkerLabel}>{label}</Text>}
    </View>
  )
}

export default function AppHomeScreen() {
  const { user, token, logout } = useAuth()
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0)
  const mapRef = useRef<MapView>(null)
  const destinationInputRef = useRef<TextInput>(null)
  const originInputRef = useRef<TextInput>(null)
  const [region, setRegion] = useState<Region>(DEFAULT_MAP_REGION)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false)
  const [addressLabel, setAddressLabel] = useState('Buscando direccion...')
  const selectedCategory: ServiceMode = 'entrega'
  const [searchStage, setSearchStage] = useState<SearchStage>('idle')
  const [searchReturnStage, setSearchReturnStage] = useState<SearchReturnStage>('idle')
  const [originInput, setOriginInput] = useState('Mi ubicacion actual')
  const [destinationInput, setDestinationInput] = useState('')
  const [focusedField, setFocusedField] = useState<SearchField | null>(null)
  const [routeResult, setRouteResult] = useState<SearchResult | null>(null)
  const [autoAccept, setAutoAccept] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState<RouteOfferId>('economico')
  const [, setRenderSearchComposer] = useState(false)
  const [renderResultsChrome, setRenderResultsChrome] = useState(false)
  const [originSelection, setOriginSelection] = useState<PlaceSuggestion | null>(null)
  const [destinationSelection, setDestinationSelection] = useState<PlaceSuggestion | null>(null)
  const [activeSuggestions, setActiveSuggestions] = useState<PlaceSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [serviceMessage, setServiceMessage] = useState<string | null>(null)
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft>(EMPTY_DELIVERY_DRAFT)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [deliveryFormError, setDeliveryFormError] = useState<string | null>(null)
  const [shipmentQuote, setShipmentQuote] = useState<ShipmentQuote | null>(null)
  const [deliveryWizardStep, setDeliveryWizardStep] = useState<DeliveryWizardStep>('route')
  const [deliveryRequestStatus, setDeliveryRequestStatus] = useState<DeliveryRequestStatus>('idle')
  const [assignedDriver, setAssignedDriver] = useState<AssignedDriver | null>(null)
  const [currentShipmentId, setCurrentShipmentId] = useState<string | null>(null)
  const [searchSessionToken, setSearchSessionToken] = useState('')
  const [myShipments, setMyShipments] = useState<MyShipment[]>([])
  const [routeAlerts, setRouteAlerts] = useState<RouteAlert[]>([])
  const searchProgress = useRef(new Animated.Value(0)).current
  const resultsProgress = useRef(new Animated.Value(0)).current
  const searchingPulse = useRef(new Animated.Value(0)).current
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentLocationLabel = useMemo(() => {
    const trimmed = addressLabel.trim()
    if (!trimmed || trimmed === 'Buscando direccion...') return 'Mi ubicacion actual'
    return trimmed
  }, [addressLabel])

  useEffect(() => {
    let isMounted = true
    let locationSubscription: Awaited<ReturnType<typeof watchUserLocation>> | null = null

    async function syncAddress(latitude: number, longitude: number) {
      const label = await getAddressLabel(latitude, longitude)
      if (!isMounted) return
      setAddressLabel(label ?? 'Ubicacion aproximada')
    }

    async function loadLocation(forceRequest = false, animate = true) {
      const result = await getInitialMapRegion(forceRequest)
      if (!isMounted) return

      setRegion(result.region)
      void syncAddress(result.region.latitude, result.region.longitude)

      if (result.permission !== 'granted') {
        setStatus('permission_denied')
      } else if (!result.servicesEnabled) {
        setStatus('services_off')
      } else {
        setStatus(result.source === 'device' ? 'device' : 'loading')
      }

      if (animate) {
        mapRef.current?.animateToRegion(result.region, 450)
      }

      if (result.permission === 'granted') {
        locationSubscription = await watchUserLocation(nextRegion => {
          if (!isMounted) return
          setRegion(nextRegion)
          setStatus('device')
          void syncAddress(nextRegion.latitude, nextRegion.longitude)
        })
      }
    }

    loadLocation(true).catch(() => {
      if (!isMounted) return
      setRegion(DEFAULT_MAP_REGION)
      setStatus('error')
    })

    return () => {
      isMounted = false
      locationSubscription?.remove()
    }
  }, [])

  const loadShipments = useCallback(async () => {
    if (!token) return
    try {
      const shipments = await fetchMyShipments(token)
      setMyShipments(shipments)
    } catch {
      // falla silenciosamente, se reintenta en el proximo focus
    }
  }, [token])

  const loadRouteAlerts = useCallback(async () => {
    if (!token) return
    try {
      setRouteAlerts(await fetchMyRouteAlerts(token))
    } catch {}
  }, [token])

  useFocusEffect(
    useCallback(() => {
      void loadShipments()
      void loadRouteAlerts()
    }, [loadShipments, loadRouteAlerts])
  )

  // Socket: mantiene "myShipments" al día en tiempo real (chip de envío activo,
  // historial) sin depender de que la pantalla vuelva a tener foco. El listener
  // de mas abajo (para el panel de tracking en vivo) solo corre mientras
  // searchStage === 'delivery_tracking'; este corre siempre que haya sesión.
  useEffect(() => {
    if (!token) return
    const socket = getSocket()
    function handleAnyStatusChanged() {
      void loadShipments()
    }
    function handleRouteAlert() {
      void loadRouteAlerts()
    }
    socket?.on('shipment:status_changed', handleAnyStatusChanged)
    socket?.on('route-alert:available', handleRouteAlert)
    return () => {
      socket?.off('shipment:status_changed', handleAnyStatusChanged)
      socket?.off('route-alert:available', handleRouteAlert)
    }
  }, [token, loadShipments, loadRouteAlerts])

  useEffect(() => {
    if (searchStage === 'editing') {
      setRenderSearchComposer(true)
      Animated.timing(searchProgress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.timing(searchProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRenderSearchComposer(false)
    })
  }, [searchProgress, searchStage])

  useEffect(() => {
    if (searchStage === 'results' || searchStage === 'delivery_tracking') {
      setRenderResultsChrome(true)
      Animated.timing(resultsProgress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.timing(resultsProgress, {
      toValue: 0,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRenderResultsChrome(false)
    })
  }, [resultsProgress, searchStage])

  // Socket: recibe cambios de estado del envío en tiempo real
  useEffect(() => {
    if (searchStage !== 'delivery_tracking' || !currentShipmentId || !token) return
    if (deliveryRequestStatus === 'delivered' || deliveryRequestStatus === 'no_coverage') return

    const socket = getSocket()

    type StatusChangedPayload = {
      shipmentId: string
      status: string
      driver?: { id: string; name: string; phone: string | null; rating: number | null; ratingCount: number } | null
    }

    function handleStatusChanged(data: StatusChangedPayload) {
      if (data.shipmentId !== currentShipmentId) return
      if (data.status === 'ASSIGNED') {
        if (data.driver) setAssignedDriver(data.driver)
        setDeliveryRequestStatus('accepted')
      } else if (data.status === 'PICKED_UP') {
        setDeliveryRequestStatus('picked_up')
      } else if (data.status === 'DELIVERED') {
        setDeliveryRequestStatus('delivered')
      } else if (data.status === 'NO_COVERAGE') {
        setDeliveryRequestStatus('no_coverage')
      }
    }

    socket?.on('shipment:status_changed', handleStatusChanged)

    return () => {
      socket?.off('shipment:status_changed', handleStatusChanged)
    }
  }, [currentShipmentId, searchStage, token, deliveryRequestStatus])

  // Fallback polling: compensa eventos socket perdidos por reconexión (intervalo largo)
  useEffect(() => {
    if (searchStage !== 'delivery_tracking' || !currentShipmentId || !token) return
    if (deliveryRequestStatus === 'delivered' || deliveryRequestStatus === 'no_coverage') return

    let cancelled = false

    type ShipmentPollResponse = {
      shipment: {
        status: string
        job?: {
          driver: { id: string; name: string; phone: string | null; rating: number | null; ratingCount: number }
        } | null
      }
    }

    async function poll() {
      try {
        const data = await api.get<ShipmentPollResponse>(`/shipments/${currentShipmentId}`, token!)
        if (cancelled) return
        if (data.shipment.status === 'ASSIGNED') {
          if (data.shipment.job?.driver) {
            const d = data.shipment.job.driver
            setAssignedDriver({ id: d.id, name: d.name, phone: d.phone, rating: d.rating, ratingCount: d.ratingCount })
          }
          setDeliveryRequestStatus('accepted')
        } else if (data.shipment.status === 'PICKED_UP') {
          if (data.shipment.job?.driver) {
            const d = data.shipment.job.driver
            setAssignedDriver({ id: d.id, name: d.name, phone: d.phone, rating: d.rating, ratingCount: d.ratingCount })
          }
          setDeliveryRequestStatus('picked_up')
        } else if (data.shipment.status === 'DELIVERED') {
          setDeliveryRequestStatus('delivered')
        } else if (data.shipment.status === 'NO_COVERAGE') {
          setDeliveryRequestStatus('no_coverage')
        }
      } catch {
        // falla silenciosamente, reintenta en el próximo ciclo
      }
    }

    // Una sola verificación al montar (cubre estado perdido mientras la app estaba cerrada)
    poll()
    const intervalId = setInterval(poll, 30_000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [currentShipmentId, searchStage, token, deliveryRequestStatus])

  // Cinematic map animation while searching for a driver.
  // Sequence (loops): zoom origin → wide route view → zoom destination → wide route view
  // Uses only animateCamera (no fitToCoordinates) to prevent white tile flash.
  useEffect(() => {
    if (
      searchStage !== 'delivery_tracking' ||
      deliveryRequestStatus !== 'searching' ||
      !routeResult
    ) return

    const origin = routeResult.originPoint
    const destination = routeResult.destinationPoint
    const midLat = (origin.latitude + destination.latitude) / 2
    const midLng = (origin.longitude + destination.longitude) / 2

    // Approximate route span to pick a wide-view zoom
    const latDelta = Math.abs(origin.latitude - destination.latitude)
    const lngDelta = Math.abs(origin.longitude - destination.longitude)
    const span = Math.max(latDelta, lngDelta)
    // Pan between points keeping the same zoom level as the route view.
    // Using the same latitudeDelta avoids loading new tile zoom levels → no white flash.
    const routeDelta = Math.max(span * 1.6, 0.06)
    const MOVE_CLOSE = 2000
    const MOVE_MID = 2400
    const HOLD_CLOSE = 3000
    const HOLD_MID = 2400

    // Pan close to each point but keep the same zoom as the route overview
    const originRegion = { latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: routeDelta, longitudeDelta: routeDelta }
    const destinationRegion = { latitude: destination.latitude, longitude: destination.longitude, latitudeDelta: routeDelta, longitudeDelta: routeDelta }
    const midRegion = { latitude: midLat, longitude: midLng, latitudeDelta: routeDelta, longitudeDelta: routeDelta }

    const handles: ReturnType<typeof setTimeout>[] = []
    let loopHandle: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function at(t: number, fn: () => void) {
      const h = setTimeout(() => { if (!stopped) fn() }, t)
      handles.push(h)
    }

    function runCycle() {
      let t = 0

      // 1. Pan to origin
      at(t, () => mapRef.current?.animateToRegion(originRegion, MOVE_CLOSE))
      t += MOVE_CLOSE + HOLD_CLOSE

      // 2. Pan to mid route view
      at(t, () => mapRef.current?.animateToRegion(midRegion, MOVE_MID))
      t += MOVE_MID + HOLD_MID

      // 3. Pan to destination
      at(t, () => mapRef.current?.animateToRegion(destinationRegion, MOVE_CLOSE))
      t += MOVE_CLOSE + HOLD_CLOSE

      // 4. Pan back to mid route view, then loop
      at(t, () => mapRef.current?.animateToRegion(midRegion, MOVE_MID))
      t += MOVE_MID + HOLD_MID

      loopHandle = setTimeout(() => { if (!stopped) runCycle() }, t)
    }

    runCycle()

    return () => {
      stopped = true
      handles.forEach(clearTimeout)
      if (loopHandle) clearTimeout(loopHandle)
    }
  }, [searchStage, deliveryRequestStatus, routeResult])

  useEffect(() => {
    searchingPulse.setValue(0)
    if (deliveryRequestStatus !== 'searching') return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(searchingPulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(searchingPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(300),
      ])
    )
    anim.start()
    return () => { anim.stop(); searchingPulse.setValue(0) }
  }, [deliveryRequestStatus, searchingPulse])

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (searchStage !== 'editing' || !focusedField) {
      setActiveSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    const query = focusedField === 'origin' ? originInput : destinationInput
    if (!query.trim() || query.trim().length < 2 || isCurrentLocationQuery(query, currentLocationLabel)) {
      setActiveSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    let isCancelled = false
    const timeoutId = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const suggestions = await autocompletePlaces({
          input: query.trim(),
          latitude: region.latitude,
          longitude: region.longitude,
          sessionToken: searchSessionToken || undefined,
        })

        if (isCancelled) return
        setActiveSuggestions(suggestions)
      } catch {
        if (isCancelled) return
        setActiveSuggestions([])
      } finally {
        if (!isCancelled) setSuggestionsLoading(false)
      }
    }, 220)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [
    currentLocationLabel,
    destinationInput,
    focusedField,
    originInput,
    region.latitude,
    region.longitude,
    searchSessionToken,
    searchStage,
  ])

  function fitRouteOnMap(nextResult: SearchResult) {
    const coordinates = [
      nextResult.originPoint,
      nextResult.destinationPoint,
      ...nextResult.routeCoordinates,
      ...nextResult.offers.map(offer => offer.marker),
    ]

    mapRef.current?.fitToCoordinates(coordinates, {
      animated: true,
      edgePadding: {
        top: topInset + 132,
        right: 54,
        bottom: insets.bottom + (selectedCategory === 'entrega' ? 418 : 326),
        left: 54,
      },
    })
  }

  function handleNavigate(href: Href) {
    setDrawerVisible(false)
    router.push(href)
  }

  function handleLogout() {
    setDrawerVisible(false)
    Alert.alert('Cerrar sesion', 'Queres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: logout },
    ])
  }

  function handleDriverMode() {
    setDrawerVisible(false)
    router.push('/driver')
  }

  function openDriverProfile() {
    if (assignedDriver?.id) {
      router.push({ pathname: '/user/[id]', params: { id: assignedDriver.id } })
    }
  }

  async function requestLocationAgain() {
    const currentPermission = await getForegroundPermissionStatus()

    if (currentPermission.canAskAgain === false) {
      Alert.alert(
        'Permiso bloqueado',
        'Android ya no muestra el aviso automaticamente. Abri ajustes y habilita la ubicacion para LLEVO.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ]
      )
      return
    }

    setHasCenteredOnUser(false)
    setStatus('loading')

    try {
      const result = await getInitialMapRegion(true)
      setRegion(result.region)
      void getAddressLabel(result.region.latitude, result.region.longitude).then(label => {
        setAddressLabel(label ?? 'Ubicacion aproximada')
      })
      if (result.permission !== 'granted') {
        setStatus('permission_denied')
        return
      }
      if (!result.servicesEnabled) {
        setStatus('services_off')
        return
      }
      setStatus(result.source === 'device' ? 'device' : 'loading')
      mapRef.current?.animateToRegion(result.region, 450)
    } catch {
      setStatus('error')
    }
  }

  function centerMap() {
    mapRef.current?.animateToRegion(region, 350)
  }

  function openSearchComposer(returnStage: SearchReturnStage = 'idle') {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    const nextWizardStep =
      selectedCategory === 'entrega'
        ? getDeliveryWizardStartStep(routeResult?.destinationLabel ?? destinationInput, deliveryDraft)
        : null

    setSearchReturnStage(returnStage)
    setServiceMessage(null)
    if (nextWizardStep) {
      setDeliveryWizardStep(nextWizardStep)
    }
    setOriginInput(routeResult?.originLabel ?? currentLocationLabel)
    setDestinationInput(routeResult?.destinationLabel ?? destinationInput)
    setFocusedField(nextWizardStep === 'route' || !nextWizardStep ? 'destination' : null)
    setSearchStage('editing')
    setSearchSessionToken(createSessionToken())

    if (nextWizardStep === 'route' || !nextWizardStep) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          destinationInputRef.current?.focus()
        }, 120)
      })
    }
  }

  function closeSearchComposer() {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    Keyboard.dismiss()
    setFocusedField(null)
    setSearchStage(searchReturnStage)
  }

  function resetSearchFlow() {
    Keyboard.dismiss()
    setFocusedField(null)
    setSearchReturnStage('idle')
    setSearchStage('idle')
    setRouteResult(null)
    setDestinationInput('')
    setDestinationSelection(null)
    setOriginSelection(null)
    setSelectedOfferId('economico')
    setServiceMessage(null)
    setDeliveryDraft(EMPTY_DELIVERY_DRAFT)
    setShowDatePicker(false)
    setDeliveryFormError(null)
    setDeliveryWizardStep('route')
    setDeliveryRequestStatus('idle')
    setAssignedDriver(null)
    setCurrentShipmentId(null)
    centerMap()
    void loadShipments()
  }

  async function handleCancelSearch() {
    const shipmentId = currentShipmentId

    if (!shipmentId || !token) {
      resetSearchFlow()
      return
    }

    try {
      await cancelShipment(token, shipmentId)
      resetSearchFlow()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout()
        return
      }
      Alert.alert(
        'No se pudo cancelar',
        err instanceof Error ? err.message : 'Intenta de nuevo en unos segundos.'
      )
    }
  }

  function patchDeliveryDraft(patch: Partial<DeliveryDraft>) {
    setDeliveryDraft(current => ({ ...current, ...patch }))
    setDeliveryFormError(null)
  }

  function goToPreviousDeliveryWizardStep() {
    const currentIndex = DELIVERY_WIZARD_STEPS.findIndex(step => step.id === deliveryWizardStep)
    if (currentIndex <= 0) return

    Keyboard.dismiss()
    setFocusedField(null)
    setDeliveryFormError(null)
    setDeliveryWizardStep(DELIVERY_WIZARD_STEPS[currentIndex - 1]?.id ?? 'route')
  }

  function requestShipmentQuote() {
    if (!token || !routeResult) return
    const weightKg = parseFloat(deliveryDraft.estimatedWeight.trim().replace(',', '.'))
    if (!Number.isFinite(weightKg) || !deliveryDraft.estimatedSize) return
    void api.post<{ quote: ShipmentQuote }>('/shipments/quote', {
      weightKg,
      packageSize: deliveryDraft.estimatedSize.toUpperCase(),
      estimatedDistanceKm: Math.max(0.5, routeResult.distanceMeters / 1000),
      estimatedDurationMin: Math.max(5, Math.round(routeResult.durationSeconds / 60)),
    }, token).then(data => setShipmentQuote(data.quote)).catch(() => setShipmentQuote(null))
  }

  function handleDeliveryWizardNextStep() {
    const validationMessage =
      deliveryWizardStep === 'route'
        ? validateDeliveryRouteStep(destinationInput)
        : deliveryWizardStep === 'package'
          ? validateDeliveryPackageStep(deliveryDraft)
          : validateDeliveryContactsStep(deliveryDraft)

    if (validationMessage) {
      setDeliveryFormError(validationMessage)
      return
    }

    const currentIndex = DELIVERY_WIZARD_STEPS.findIndex(step => step.id === deliveryWizardStep)
    const nextStep = DELIVERY_WIZARD_STEPS[currentIndex + 1]?.id

    if (!nextStep) {
      if (validateSenderPhone(user?.phone)) {
        Alert.alert(
          'Falta tu telefono',
          'Necesitamos un telefono verificado para que el conductor pueda coordinar el retiro.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Verificar telefono', onPress: () => router.push('/verify-phone') },
          ]
        )
        return
      }
      void submitSearch()
      return
    }

    Keyboard.dismiss()
    setFocusedField(null)
    setDeliveryFormError(null)
    setDeliveryWizardStep(nextStep)
    if (nextStep === 'contacts') requestShipmentQuote()
  }

  function handleFieldFocus(field: SearchField) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    setFocusedField(field)
  }

  function handleFieldBlur(field: SearchField) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }

    blurTimeoutRef.current = setTimeout(() => {
      setFocusedField(current => (current === field ? null : current))
      blurTimeoutRef.current = null
    }, 140)
  }

  function updateOriginValue(value: string) {
    setOriginInput(value)
    if (originSelection && normalizeText(originSelection.text) !== normalizeText(value)) {
      setOriginSelection(null)
    }
  }

  function updateDestinationValue(value: string) {
    setDestinationInput(value)
    if (destinationSelection && normalizeText(destinationSelection.text) !== normalizeText(value)) {
      setDestinationSelection(null)
    }
  }

  async function resolveSuggestion(query: string) {
    const suggestions = await autocompletePlaces({
      input: query.trim(),
      latitude: region.latitude,
      longitude: region.longitude,
      sessionToken: searchSessionToken || undefined,
    })

    return suggestions[0] ?? null
  }

  async function submitShipmentToAPI(nextResult: SearchResult) {
    if (!token) return
    try {
      const weightKg = parseFloat(deliveryDraft.estimatedWeight.trim().replace(',', '.'))
      const data = await api.post<{ shipment: { id: string; status: string } }>('/shipments', {
        originCity: nextResult.originCity ?? extractCity(nextResult.originLabel),
        destinationCity: nextResult.destinationCity ?? extractCity(nextResult.destinationLabel),
        originAddress: nextResult.originLabel,
        deliveryAddress: [nextResult.destinationLabel, deliveryDraft.deliveryAddress].filter(Boolean).join(', '),
        weightKg,
        packageSize: (deliveryDraft.estimatedSize ?? 'medium').toUpperCase(),
        estimatedDistanceKm: Math.max(0.5, nextResult.distanceMeters / 1000),
        estimatedDurationMin: Math.max(5, Math.round(nextResult.durationSeconds / 60)),
        pickupContactName: user?.name ?? '',
        pickupContactPhone: user?.phone ?? '',
        recipientDetails: deliveryDraft.deliveryDetails,
        notes: deliveryDraft.notes || undefined,
        // Noon ART (UTC-3) on the selected date → 15:00 UTC
        preferredDate: deliveryDraft.preferredDate
          ? `${deliveryDraft.preferredDate}T15:00:00.000Z`
          : undefined,
      }, token)

      setCurrentShipmentId(data.shipment.id)
      if (data.shipment.status === 'NO_COVERAGE') {
        setDeliveryRequestStatus('no_coverage')
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout()
        return
      }

      // Sin esto, la UI se queda mostrando "buscando conductor" para siempre:
      // el submit fallo antes de obtener un currentShipmentId, asi que el socket
      // y el polling de estado nunca se activan. Volvemos al wizard con el error.
      setDeliveryRequestStatus('idle')
      setDeliveryWizardStep('contacts')
      setDeliveryFormError(err instanceof Error ? err.message : 'Error al registrar el pedido.')
      setSearchStage('editing')
    }
  }

  function startDeliveryTracking(nextResult: SearchResult, preferredOfferId?: RouteOfferId) {
    const nextOfferId: RouteOfferId = preferredOfferId && nextResult.offers.some(offer => offer.id === preferredOfferId)
      ? preferredOfferId
      : nextResult.offers[0]?.id ?? 'economico'

    setSelectedOfferId(nextOfferId)
    setSearchReturnStage('results')
    setFocusedField(null)
    setDeliveryRequestStatus('searching')
    setSearchStage('delivery_tracking')

    submitShipmentToAPI(nextResult).catch(() => {})

    setTimeout(() => {
      fitRouteOnMap(nextResult)
    }, 90)
  }

  function resumeTracking(shipment: MyShipment) {
    const fallbackResult = buildFallbackSearchResult(
      shipment.originAddress,
      shipment.deliveryAddress,
      toLatLng(region),
      currentLocationLabel
    )
    const deliverySize = packageSizeToDeliverySize(shipment.packageSize)

    setRouteResult(fallbackResult)
    setCurrentShipmentId(shipment.id)
    setDeliveryDraft({
      ...EMPTY_DELIVERY_DRAFT,
      estimatedWeight: String(shipment.weightKg),
      estimatedSize: deliverySize,
      deliveryDetails: shipment.recipientDetails,
    })
    setSelectedOfferId(getPreferredDeliveryOfferId(deliverySize))
    setAssignedDriver(
      shipment.job
        ? { id: shipment.job.driver.id, name: shipment.job.driver.name, phone: null, rating: shipment.job.driver.rating, ratingCount: 0 }
        : null
    )
    setDeliveryRequestStatus(shipmentStatusToTrackingStatus(shipment.status))
    setSearchReturnStage('results')
    setFocusedField(null)
    setSearchStage('delivery_tracking')

    // Delay mayor que en startDeliveryTracking: el mapa recien se monta al salir del dashboard.
    setTimeout(() => {
      fitRouteOnMap(fallbackResult)
    }, 350)
  }

  async function submitSearch(options?: { origin?: PlaceSuggestion | null; destination?: PlaceSuggestion | null }) {
    if (routeLoading) return

    const nextOriginValue = options?.origin?.text?.trim() || originInput.trim() || currentLocationLabel
    const nextDestinationValue = options?.destination?.text?.trim() || destinationInput.trim()
    if (!nextDestinationValue) return

    if (selectedCategory === 'entrega') {
      const validationMessage = validateDeliveryDraft(nextDestinationValue, deliveryDraft)
      if (validationMessage) {
        setDeliveryFormError(validationMessage)
        return
      }
    }

    Keyboard.dismiss()
    setRouteLoading(true)
    setServiceMessage(null)
    setDeliveryFormError(null)

    try {
      let resolvedOrigin = options?.origin ?? originSelection
      let resolvedDestination = options?.destination ?? destinationSelection

      const originPayload = isCurrentLocationQuery(nextOriginValue, currentLocationLabel)
        ? {
            latitude: region.latitude,
            longitude: region.longitude,
            label: currentLocationLabel,
          }
        : null

      if (!originPayload) {
        if (!resolvedOrigin || normalizeText(resolvedOrigin.text) !== normalizeText(nextOriginValue)) {
          resolvedOrigin = await resolveSuggestion(nextOriginValue)
        }
      }

      if (!resolvedDestination || normalizeText(resolvedDestination.text) !== normalizeText(nextDestinationValue)) {
        resolvedDestination = await resolveSuggestion(nextDestinationValue)
      }

      if (!resolvedDestination) {
        throw new Error('No pude ubicar ese destino')
      }

      const route = await computeRoutePreview({
        origin: originPayload ?? {
          placeId: resolvedOrigin?.placeId,
          label: resolvedOrigin?.text || nextOriginValue,
        },
        destination: {
          placeId: resolvedDestination.placeId,
          label: resolvedDestination.text,
        },
        travelMode: selectedCategory === 'moto' ? 'TWO_WHEELER' : 'DRIVE',
        sessionToken: searchSessionToken || undefined,
      })

      const nextResult = buildLiveSearchResult(route)
      setOriginSelection(resolvedOrigin)
      setDestinationSelection(resolvedDestination)
      setOriginInput(nextResult.originLabel)
      setDestinationInput(nextResult.destinationLabel)
      setRouteResult(nextResult)

      if (selectedCategory === 'entrega') {
        startDeliveryTracking(nextResult, getPreferredDeliveryOfferId(deliveryDraft.estimatedSize))
        return
      }

      setSelectedOfferId(nextResult.offers[0]?.id ?? 'economico')
      setSearchReturnStage('results')
      setFocusedField(null)
      setSearchStage('results')

      setTimeout(() => {
        fitRouteOnMap(nextResult)
      }, 90)
    } catch (error) {
      const fallbackResult = buildFallbackSearchResult(nextOriginValue, nextDestinationValue, toLatLng(region), currentLocationLabel)
      setRouteResult(fallbackResult)
      setServiceMessage(
        error instanceof Error
          ? `${error.message}. Mostrando una ruta aproximada hasta configurar Google Maps.`
          : 'Mostrando una ruta aproximada hasta configurar Google Maps.'
      )

      if (selectedCategory === 'entrega') {
        startDeliveryTracking(fallbackResult, getPreferredDeliveryOfferId(deliveryDraft.estimatedSize))
        return
      }

      setSelectedOfferId(fallbackResult.offers[0]?.id ?? 'economico')
      setSearchReturnStage('results')
      setFocusedField(null)
      setSearchStage('results')

      setTimeout(() => {
        fitRouteOnMap(fallbackResult)
      }, 90)
    } finally {
      setRouteLoading(false)
    }
  }

  function handlePrimaryMapControl() {
    if (routeResult) {
      fitRouteOnMap(routeResult)
      return
    }
    centerMap()
  }

  function handleOfferCTA() {
    const selectedOffer = routeResult?.offers.find(offer => offer.id === selectedOfferId)
    if (!selectedOffer || !routeResult) return

    if (selectedCategory === 'entrega') {
      setServiceMessage(null)
      setDeliveryRequestStatus('searching')
      setSearchStage('delivery_tracking')

      submitShipmentToAPI(routeResult).catch(() => {})

      setTimeout(() => {
        fitRouteOnMap(routeResult)
      }, 90)

      return
    }

    Alert.alert(
      'Oferta lista',
      `${selectedOffer.title} desde ${formatPrice(selectedOffer.price)} para ir de ${routeResult.originLabel} a ${routeResult.destinationLabel}.`
    )
  }

  function handleSuggestionPress(suggestion: PlaceSuggestion) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    if (focusedField === 'origin') {
      setOriginSelection(suggestion)
      setOriginInput(suggestion.text)
      setActiveSuggestions([])
      setSuggestionsLoading(false)
      requestAnimationFrame(() => {
        destinationInputRef.current?.focus()
        setFocusedField('destination')
      })
      return
    }

    Keyboard.dismiss()
    setFocusedField(null)
    setDestinationSelection(suggestion)
    setDestinationInput(suggestion.text)
    setActiveSuggestions([])
    setSuggestionsLoading(false)
    if (isDeliveryMode) {
      setDeliveryFormError(null)
      return
    }
    void submitSearch({ destination: suggestion })
  }

  const visibleMarkers = MAP_MARKERS.filter(marker => marker.category === selectedCategory)
  const showingRoute = routeResult !== null
  const activeOffer = routeResult?.offers.find(offer => offer.id === selectedOfferId) ?? routeResult?.offers[0] ?? null
  const activeQuery = focusedField === 'origin' ? originInput : destinationInput
  const isDeliveryMode = selectedCategory === 'entrega'
  const isResultsStage = searchStage === 'results'
  const isDeliveryTrackingStage = searchStage === 'delivery_tracking'
  const isMapDetailsStage = isResultsStage || isDeliveryTrackingStage
  const deliveryWizardIndex = DELIVERY_WIZARD_STEPS.findIndex(step => step.id === deliveryWizardStep)
  const activeDeliveryWizardStep = DELIVERY_WIZARD_STEPS[deliveryWizardIndex] ?? DELIVERY_WIZARD_STEPS[0]
  const showSuggestions = focusedField !== null && activeQuery.trim().length >= 2 && !isCurrentLocationQuery(activeQuery, currentLocationLabel)
  const searchComposerTitle = isDeliveryMode ? 'Coordinar entrega' : 'Que envias?'
  const destinationPlaceholder = 'A donde lo enviamos?'
  const submitRouteLabel = isDeliveryMode ? activeDeliveryWizardStep.cta : 'Iniciar busqueda'
  const resultsButtonLabel = isDeliveryMode ? 'Confirmar entrega' : 'Encontrar ofertas'
  const showDeliveryRouteStep = !isDeliveryMode || deliveryWizardStep === 'route'
  const showDeliveryPackageStep = isDeliveryMode && deliveryWizardStep === 'package'
  const showDeliveryContactsStep = isDeliveryMode && deliveryWizardStep === 'contacts'
  const canGoBackInWizard = isDeliveryMode && deliveryWizardIndex > 0
  const submitRouteDisabled =
    routeLoading ||
    (showDeliveryRouteStep ? !destinationInput.trim() : false)

  const activeShipment = myShipments.find(shipment => isActiveShipmentStatus(shipment.status)) ?? null
  const activeRouteAlert = routeAlerts[0] ?? null
  const resultsTranslateY = resultsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  })
  const resultsTopTranslateY = resultsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 0],
  })

  return (
    <View style={styles.container}>
      {searchStage === 'idle' ? (
        <HomeDashboard
          user={user}
          locationStatus={status}
          onRequestLocation={requestLocationAgain}
          onOpenDrawer={() => setDrawerVisible(true)}
          onOpenComposer={() => openSearchComposer('idle')}
          onOpenTravel={() => router.push('/(app)/travel')}
          onOpenNotifications={() => router.push('/(app)/notifications')}
          activeShipment={activeShipment}
          onResumeTracking={resumeTracking}
          activeTravelRequest={null}
          activeRouteAlert={activeRouteAlert}
          routeAlerts={routeAlerts}
          onOpenRouteAlert={alert => router.push({
            pathname: '/(app)/route-alert',
            params: {
              id: alert.id,
              origin: alert.originCity,
              destination: alert.destinationCity,
              date: alert.date,
              ...(alert.notifiedAt ? { notifiedAt: alert.notifiedAt } : {}),
            },
          })}
          onOpenTravelRequest={() => router.push('/(app)/travel')}
        />
      ) : (
        <>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={darkMapStyle}
        initialRegion={DEFAULT_MAP_REGION}
        showsBuildings={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={status === 'device'}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        loadingBackgroundColor={colors.background}
        loadingIndicatorColor={colors.lime}
        onUserLocationChange={event => {
          const coordinate = event.nativeEvent.coordinate
          if (!coordinate) return

          const nextRegion = {
            ...DEFAULT_MAP_REGION,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          }

          setRegion(nextRegion)
          setStatus('device')

          if (!hasCenteredOnUser) {
            setHasCenteredOnUser(true)
            mapRef.current?.animateToRegion(nextRegion, 450)
          }
        }}
        {...(
          Platform.OS === 'android'
            ? {
                mapPadding: {
                  top: topInset + 110,
                  right: 16,
                  bottom: insets.bottom + (isDeliveryTrackingStage ? 344 : showingRoute ? 316 : 258),
                  left: 16,
                },
              }
            : {}
        )}
      >
        {showingRoute && routeResult ? (
          <>
            <Polyline
              coordinates={routeResult.routeCoordinates}
              strokeColor={colors.lime}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />

            <Marker coordinate={routeResult.originPoint} anchor={{ x: 0.5, y: 0.5 }}>
              <SearchMarker icon="locate" label="Origen" variant="origin" />
            </Marker>

            <Marker coordinate={routeResult.destinationPoint} anchor={{ x: 0.5, y: 0.5 }}>
              <SearchMarker icon="flag" label="Destino" variant="destination" />
            </Marker>

            {(isDeliveryTrackingStage && activeOffer ? [activeOffer] : routeResult.offers).map(offer => (
              <Marker key={offer.id} coordinate={offer.marker} anchor={{ x: 0.5, y: 0.5 }}>
                <SearchMarker
                  icon={offer.icon}
                  label={isDeliveryTrackingStage && deliveryRequestStatus === 'accepted' ? 'Driver asignado' : offer.title}
                  variant="offer"
                />
              </Marker>
            ))}
          </>
        ) : (
          visibleMarkers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              title={marker.title}
            >
              <View style={styles.marker}>
                <Ionicons name={marker.icon} size={16} color={colors.black} />
              </View>
            </Marker>
          ))
        )}
      </MapView>

      <View pointerEvents="box-none" style={styles.overlay}>
        {renderResultsChrome && routeResult && (
          <>
            <Animated.View
              pointerEvents={isMapDetailsStage ? 'auto' : 'none'}
              renderToHardwareTextureAndroid
              style={[
                styles.resultsTopWrap,
                {
                  paddingTop: topInset + 12,
                  opacity: resultsProgress,
                  transform: [{ translateY: resultsTopTranslateY }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={0.84} style={styles.resultBackButton} onPress={resetSearchFlow}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={isResultsStage ? 0.9 : 1}
                disabled={!isResultsStage}
                style={styles.routeSummaryCard}
                onPress={isResultsStage ? () => openSearchComposer('results') : undefined}
              >
                <View style={styles.routeSummaryRow}>
                  <Ionicons name="locate" size={15} color={colors.text} />
                  <Text style={styles.routeSummaryText} numberOfLines={1}>{routeResult.originLabel}</Text>
                  <View style={styles.routeSummaryBadge}>
                    <Text style={styles.routeSummaryBadgeText}>{routeResult.distanceLabel}</Text>
                  </View>
                </View>

                <View style={styles.routeSummaryDivider} />

                <View style={styles.routeSummaryRow}>
                  <Ionicons name="flag" size={15} color={colors.lime} />
                  <Text style={styles.routeSummaryText} numberOfLines={1}>{routeResult.destinationLabel}</Text>
                  <View style={styles.routeSummaryBadge}>
                    <Text style={styles.routeSummaryBadgeText}>{routeResult.durationLabel}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              pointerEvents={isMapDetailsStage ? 'auto' : 'none'}
              renderToHardwareTextureAndroid
              style={[
                styles.resultsRightControls,
                {
                  top: topInset + 134,
                  opacity: resultsProgress,
                  transform: [{ translateY: resultsTopTranslateY }],
                },
              ]}
            >
              <IconButton name="navigate" onPress={handlePrimaryMapControl} variant="dark" />
              {isResultsStage && <IconButton name="options-outline" onPress={() => openSearchComposer('results')} variant="dark" />}
            </Animated.View>

            <Animated.View
              pointerEvents={isMapDetailsStage ? 'auto' : 'none'}
              renderToHardwareTextureAndroid
              style={[
                styles.resultsSheet,
                {
                  paddingBottom: insets.bottom + 18,
                  opacity: resultsProgress,
                  transform: [{ translateY: resultsTranslateY }],
                },
              ]}
            >
              <View style={styles.sheetHandle} />

              {serviceMessage && (
                <View style={styles.serviceBanner}>
                  <Ionicons name="information-circle" size={16} color={colors.warning} />
                  <Text style={styles.serviceBannerText}>{serviceMessage}</Text>
                </View>
              )}

              {isDeliveryTrackingStage && isDeliveryMode && (
                <>
                  {deliveryRequestStatus === 'searching' && (
                    <View style={styles.trackingPanel}>
                      <View style={styles.trackingPanelHeader}>
                        <View style={styles.trackingPulseWrap}>
                          <Animated.View
                            style={[
                              styles.trackingPulseRing,
                              {
                                transform: [{ scale: searchingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }],
                                opacity: searchingPulse.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1, 0.9, 0] }),
                              },
                            ]}
                          />
                          <View style={styles.trackingPulseCore} />
                        </View>
                        <View style={styles.trackingPanelCopy}>
                          <Text style={styles.trackingPanelEyebrow}>Buscando conductor</Text>
                          <Text style={styles.trackingPanelTitle}>Avisando en tu zona de retiro...</Text>
                        </View>
                      </View>

                      <View style={styles.trackingDivider} />

                      <View style={styles.trackingChipRow}>
                        <View style={styles.trackingChip}>
                          <Ionicons name="cube-outline" size={13} color={colors.lime} />
                          <Text style={styles.trackingChipText}>{formatDeliveryWeight(deliveryDraft.estimatedWeight)}</Text>
                        </View>
                        <View style={styles.trackingChip}>
                          <Ionicons name="resize-outline" size={13} color={colors.lime} />
                          <Text style={styles.trackingChipText}>{getDeliverySizeLabel(deliveryDraft.estimatedSize)}</Text>
                        </View>
                      </View>

                      <TouchableOpacity style={styles.trackingGhostBtn} activeOpacity={0.8} onPress={handleCancelSearch}>
                        <Text style={styles.trackingGhostBtnText}>Cancelar búsqueda</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {deliveryRequestStatus === 'accepted' && (
                    <View style={[styles.trackingPanel, styles.trackingPanelAccepted]}>
                      <View style={styles.trackingPanelHeader}>
                        <TouchableOpacity
                          style={styles.trackingDriverTap}
                          activeOpacity={0.7}
                          onPress={openDriverProfile}
                          disabled={!assignedDriver?.id}
                        >
                          <View style={styles.trackingDriverAvatar}>
                            <Text style={styles.trackingDriverAvatarText}>
                              {(assignedDriver?.name ?? 'C').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.trackingPanelCopy}>
                            <Text style={[styles.trackingPanelEyebrow, styles.trackingPanelEyebrowSuccess]}>
                              ¡Conductor asignado!
                            </Text>
                            <View style={styles.trackingDriverNameRow}>
                              <Text style={styles.trackingDriverName}>{assignedDriver?.name ?? 'En camino'}</Text>
                              {assignedDriver?.id ? (
                                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                              ) : null}
                            </View>
                            {assignedDriver?.rating !== null && assignedDriver?.rating !== undefined && (
                              <View style={styles.trackingDriverRatingRow}>
                                <Ionicons name="star" size={11} color={colors.lime} />
                                <Text style={styles.trackingDriverRatingText}>{assignedDriver.rating.toFixed(1)}</Text>
                                {assignedDriver.ratingCount > 0 && (
                                  <Text style={styles.trackingDriverRatingCount}>
                                    ({assignedDriver.ratingCount} viajes)
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        {assignedDriver?.phone && (
                          <TouchableOpacity
                            style={styles.trackingPhoneBtn}
                            activeOpacity={0.8}
                            onPress={() => Linking.openURL(`tel:${assignedDriver.phone}`)}
                          >
                            <Ionicons name="call" size={16} color={colors.black} />
                            <Text style={styles.trackingPhoneBtnText}>Llamar</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.trackingDivider} />

                      <View style={styles.trackingChipRow}>
                        <View style={styles.trackingChip}>
                          <Ionicons name="cube-outline" size={13} color={colors.lime} />
                          <Text style={styles.trackingChipText}>{formatDeliveryWeight(deliveryDraft.estimatedWeight)}</Text>
                        </View>
                        <View style={styles.trackingChip}>
                          <Ionicons name="resize-outline" size={13} color={colors.lime} />
                          <Text style={styles.trackingChipText}>{getDeliverySizeLabel(deliveryDraft.estimatedSize)}</Text>
                        </View>
                        {deliveryDraft.deliveryDetails ? (
                          <View style={[styles.trackingChip, { flex: 1 }]}>
                            <Ionicons name="location-outline" size={13} color={colors.lime} />
                            <Text style={[styles.trackingChipText, { flex: 1 }]} numberOfLines={1}>
                              {deliveryDraft.deliveryDetails}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {deliveryRequestStatus === 'picked_up' && (
                    <View style={[styles.trackingPanel, styles.trackingPanelAccepted]}>
                      <View style={styles.trackingPanelHeader}>
                        <TouchableOpacity
                          style={styles.trackingDriverTap}
                          activeOpacity={0.7}
                          onPress={openDriverProfile}
                          disabled={!assignedDriver?.id}
                        >
                          <View style={styles.trackingDriverAvatar}>
                            <Text style={styles.trackingDriverAvatarText}>
                              {(assignedDriver?.name ?? 'C').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.trackingPanelCopy}>
                            <Text style={[styles.trackingPanelEyebrow, styles.trackingPanelEyebrowSuccess]}>
                              Paquete retirado
                            </Text>
                            <View style={styles.trackingDriverNameRow}>
                              <Text style={styles.trackingDriverName}>{assignedDriver?.name ?? 'Conductor'}</Text>
                              {assignedDriver?.id ? (
                                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                              ) : null}
                            </View>
                            <Text style={[styles.trackingPanelEyebrow, { marginTop: 3, textTransform: 'none', letterSpacing: 0, color: colors.textMuted }]}>
                              En camino a la entrega
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {assignedDriver?.phone && (
                          <TouchableOpacity
                            style={styles.trackingPhoneBtn}
                            activeOpacity={0.8}
                            onPress={() => Linking.openURL(`tel:${assignedDriver.phone}`)}
                          >
                            <Ionicons name="call" size={16} color={colors.black} />
                            <Text style={styles.trackingPhoneBtnText}>Llamar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {deliveryRequestStatus === 'delivered' && (
                    <View style={[styles.trackingPanel, styles.trackingPanelAccepted]}>
                      <View style={styles.trackingNoCoverageTop}>
                        <Ionicons name="checkmark-circle" size={36} color={colors.lime} />
                        <Text style={styles.trackingNoCoverageTitle}>¡Entregado!</Text>
                        <Text style={styles.trackingNoCoverageBody}>
                          Tu paquete llegó a destino.
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.trackingPrimaryBtn} activeOpacity={0.85} onPress={resetSearchFlow}>
                        <Text style={styles.trackingPrimaryBtnText}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {deliveryRequestStatus === 'no_coverage' && (
                    <View style={styles.trackingPanel}>
                      <View style={styles.trackingNoCoverageTop}>
                        <Ionicons name="alert-circle" size={30} color={colors.warning} />
                        <Text style={styles.trackingNoCoverageTitle}>Sin cobertura disponible</Text>
                        <Text style={styles.trackingNoCoverageBody}>
                          No encontramos conductores para esta ruta. Intentá con otro destino o en otro momento.
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.trackingPrimaryBtn} activeOpacity={0.85} onPress={closeSearchComposer}>
                        <Text style={styles.trackingPrimaryBtnText}>Modificar ruta</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {isResultsStage && isDeliveryMode ? (
                <>
                  <View style={styles.deliveryRouteCard}>
                    <View style={styles.deliveryRouteRow}>
                      <View style={styles.deliveryRouteDot} />
                      <Text style={styles.deliveryRouteLabel} numberOfLines={1}>{routeResult.originLabel}</Text>
                      <Text style={styles.deliveryRouteMeta}>{routeResult.distanceLabel}</Text>
                    </View>
                    <View style={styles.deliveryRouteLine} />
                    <View style={styles.deliveryRouteRow}>
                      <Ionicons name="location" size={14} color={colors.lime} />
                      <Text style={styles.deliveryRouteLabel} numberOfLines={1}>{routeResult.destinationLabel}</Text>
                      <Text style={styles.deliveryRouteMeta}>{routeResult.durationLabel}</Text>
                    </View>
                  </View>

                  <TouchableOpacity activeOpacity={0.88} style={styles.deliveryStartBtn} onPress={handleOfferCTA}>
                    <Ionicons name="cube-outline" size={18} color={colors.black} />
                    <Text style={styles.deliveryStartBtnText}>Configurar entrega</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.black} />
                  </TouchableOpacity>
                </>
              ) : isResultsStage ? (
                <>
                  <TouchableOpacity activeOpacity={0.86} style={styles.promoRow}>
                    <Text style={styles.promoText}>Tenes un codigo promocional? Usalo</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.offerList}>
                    {routeResult.offers.map(offer => {
                      const isActive = offer.id === selectedOfferId

                      return (
                        <TouchableOpacity
                          key={offer.id}
                          activeOpacity={0.9}
                          style={[styles.offerCard, isActive && styles.offerCardActive]}
                          onPress={() => setSelectedOfferId(offer.id)}
                        >
                          <View style={styles.offerIconWrap}>
                            <Ionicons name={offer.icon} size={18} color={colors.lime} />
                          </View>

                          <View style={styles.offerCopy}>
                            <View style={styles.offerHeaderRow}>
                              <Text style={styles.offerTitle}>{offer.title}</Text>
                              <View style={styles.offerSeatBadge}>
                                <Ionicons name="person" size={11} color={colors.textMuted} />
                                <Text style={styles.offerSeatBadgeText}>{offer.seatsLabel}</Text>
                              </View>
                            </View>
                            <Text style={styles.offerSubtitle}>{offer.subtitle}</Text>
                          </View>

                          <View style={styles.offerMeta}>
                            <Text style={styles.offerPrice}>{formatPrice(offer.price)}</Text>
                            <Text style={styles.offerEta}>{offer.eta}</Text>
                          </View>

                          <View style={[styles.offerSelector, isActive && styles.offerSelectorActive]}>
                            <Ionicons
                              name={isActive ? 'checkmark' : 'add'}
                              size={15}
                              color={isActive ? colors.black : colors.text}
                            />
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <View style={styles.autoAcceptRow}>
                    <View style={styles.autoAcceptCopy}>
                      <Text style={styles.autoAcceptTitle}>Aceptar automaticamente la oferta de {activeOffer ? formatPrice(activeOffer.price) : 'ARS 0'}</Text>
                      <Text style={styles.autoAcceptText}>Activalo para agarrar primero las opciones rapidas.</Text>
                    </View>

                    <Switch
                      value={autoAccept}
                      onValueChange={setAutoAccept}
                      thumbColor={autoAccept ? colors.black : colors.text}
                      trackColor={{ false: colors.surfaceMuted, true: colors.lime }}
                    />
                  </View>

                  <View style={styles.resultsActionRow}>
                    <TouchableOpacity activeOpacity={0.86} style={styles.findOffersButton} onPress={handleOfferCTA}>
                      <Text style={styles.findOffersButtonText}>{resultsButtonLabel}</Text>
                    </TouchableOpacity>
                    <IconButton name="funnel-outline" onPress={() => openSearchComposer('results')} variant="light" />
                  </View>
                </>
              ) : null}
            </Animated.View>
          </>
        )}
      </View>
        </>
      )}

      <Modal
          visible={searchStage === 'editing'}
          animationType="slide"
          onRequestClose={closeSearchComposer}
        >
          <View style={styles.wizardScreen}>
            <View style={[styles.wizardScreenHeader, { paddingTop: topInset + 8 }]}>
              <TouchableOpacity style={styles.wizardBackBtn} onPress={closeSearchComposer} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.wizardHeaderTitle}>{searchComposerTitle}</Text>
              <View style={styles.wizardHeaderSpacer} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.wizardContent}
              >
                  <View style={styles.searchFieldsArea}>
                    {isDeliveryMode && (
                      <>
                        <View style={styles.deliveryWizardProgressRow}>
                          {DELIVERY_WIZARD_STEPS.map((step, index) => {
                            const isActive = step.id === deliveryWizardStep
                            const isDone = index < deliveryWizardIndex

                            return (
                              <View
                                key={step.id}
                                style={[
                                  styles.deliveryWizardProgressPill,
                                  isActive && styles.deliveryWizardProgressPillActive,
                                  isDone && styles.deliveryWizardProgressPillDone,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.deliveryWizardProgressStep,
                                    isActive && styles.deliveryWizardProgressStepActive,
                                    isDone && styles.deliveryWizardProgressStepDone,
                                  ]}
                                >
                                  {index + 1}
                                </Text>
                                <Text
                                  style={[
                                    styles.deliveryWizardProgressText,
                                    isActive && styles.deliveryWizardProgressTextActive,
                                    isDone && styles.deliveryWizardProgressTextDone,
                                  ]}
                                >
                                  {step.label}
                                </Text>
                              </View>
                            )
                          })}
                        </View>

                        <View style={styles.deliveryWizardIntroCard}>
                          <Text style={styles.deliveryWizardStepEyebrow}>
                            Paso {deliveryWizardIndex + 1} de {DELIVERY_WIZARD_STEPS.length}
                          </Text>
                          <Text style={styles.deliveryWizardStepTitle}>{activeDeliveryWizardStep.title}</Text>
                          <Text style={styles.deliveryWizardStepText}>{activeDeliveryWizardStep.subtitle}</Text>
                        </View>
                      </>
                    )}

                    {showDeliveryRouteStep && (
                      <View style={styles.routeStepArea}>
                        <View style={styles.routeInputsStack}>
                          <View style={[styles.routeInputCard, focusedField === 'origin' && styles.routeInputCardActive]}>
                            <Ionicons name="locate" size={16} color={colors.textMuted} />
                            <Pressable style={styles.routeInputCopy} onPress={() => originInputRef.current?.focus()}>
                              <Text style={styles.routeInputLabel}>De</Text>
                              <TextInput
                                ref={originInputRef}
                                value={originInput}
                                onChangeText={updateOriginValue}
                                placeholder="Tu ubicacion actual"
                                placeholderTextColor={colors.textMuted}
                                style={styles.routeInputText}
                                selectionColor={colors.lime}
                                onFocus={() => handleFieldFocus('origin')}
                                onBlur={() => handleFieldBlur('origin')}
                                returnKeyType="next"
                                onSubmitEditing={() => {
                                  destinationInputRef.current?.focus()
                                  setFocusedField('destination')
                                }}
                              />
                            </Pressable>
                            <TouchableOpacity activeOpacity={0.82} style={styles.routeInputIconButton} onPress={() => {
                              setOriginSelection(null)
                              setOriginInput(currentLocationLabel)
                            }}>
                              <Ionicons name="navigate" size={16} color={colors.text} />
                            </TouchableOpacity>
                          </View>

                          <View style={[styles.routeInputCard, focusedField === 'destination' && styles.routeInputCardActive]}>
                            <Ionicons name="search" size={16} color={colors.textMuted} />
                            <Pressable style={styles.routeInputCopy} onPress={() => destinationInputRef.current?.focus()}>
                              <Text style={styles.routeInputLabel}>A</Text>
                              <TextInput
                                ref={destinationInputRef}
                                value={destinationInput}
                                onChangeText={updateDestinationValue}
                                placeholder={destinationPlaceholder}
                                placeholderTextColor={colors.textMuted}
                                style={styles.routeInputText}
                                selectionColor={colors.lime}
                                returnKeyType={isDeliveryMode ? 'next' : 'search'}
                                onFocus={() => handleFieldFocus('destination')}
                                onBlur={() => handleFieldBlur('destination')}
                                onSubmitEditing={() => {
                                  if (isDeliveryMode) {
                                    handleDeliveryWizardNextStep()
                                    return
                                  }
                                  void submitSearch()
                                }}
                              />
                            </Pressable>
                            <TouchableOpacity
                              activeOpacity={0.82}
                              style={styles.routeInputIconButton}
                              onPress={() => {
                                if (isDeliveryMode) {
                                  handleDeliveryWizardNextStep()
                                  return
                                }
                                void submitSearch()
                              }}
                            >
                              <Ionicons name={isDeliveryMode ? 'arrow-forward' : 'sparkles'} size={16} color={colors.text} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {showSuggestions && (
                          <View style={styles.suggestionsPopover}>
                            <Text style={styles.suggestionsPopoverTitle}>Sugerencias</Text>

                            <View style={styles.suggestionsCard}>
                              {suggestionsLoading ? (
                                <View style={styles.suggestionLoadingRow}>
                                  <ActivityIndicator color={colors.lime} size="small" />
                                  <Text style={styles.suggestionLoadingText}>Buscando lugares...</Text>
                                </View>
                              ) : activeSuggestions.length > 0 ? (
                                <ScrollView
                                  nestedScrollEnabled
                                  keyboardShouldPersistTaps="always"
                                  style={styles.suggestionsScroll}
                                >
                                  {activeSuggestions.map(suggestion => (
                                    <TouchableOpacity
                                      key={suggestion.placeId}
                                      activeOpacity={0.86}
                                      style={styles.suggestionRow}
                                      onPress={() => handleSuggestionPress(suggestion)}
                                    >
                                      <View style={styles.suggestionIconWrap}>
                                        <Ionicons name="location-outline" size={16} color={colors.lime} />
                                      </View>

                                      <View style={styles.suggestionCopy}>
                                        <Text style={styles.suggestionTitle} numberOfLines={1}>{suggestion.mainText || suggestion.text}</Text>
                                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                                          {suggestion.secondaryText || suggestion.text}
                                        </Text>
                                      </View>

                                      {typeof suggestion.distanceMeters === 'number' && (
                                        <Text style={styles.suggestionDistance}>{formatDistance(suggestion.distanceMeters)}</Text>
                                      )}
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              ) : (
                                <Text style={styles.suggestionEmptyText}>No aparecieron sugerencias para esa busqueda todavia.</Text>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {showDeliveryPackageStep && (
                      <View style={styles.deliverySection}>
                        <View style={styles.deliverySectionHeader}>
                          <View style={styles.deliverySectionBadge}>
                            <Ionicons name="cube" size={15} color={colors.black} />
                          </View>
                          <View style={styles.deliverySectionCopy}>
                            <Text style={styles.deliverySectionTitle}>Datos del paquete</Text>
                            <Text style={styles.deliverySectionSubtitle}>
                              Con esto elegimos el vehiculo correcto y evitamos rechazos por capacidad.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.deliveryWizardSummaryCard}>
                          <View style={styles.deliveryWizardSummaryRow}>
                            <Ionicons name="flag" size={15} color={colors.lime} />
                            <Text style={styles.deliveryWizardSummaryText} numberOfLines={1}>
                              {destinationInput.trim() || 'Destino pendiente'}
                            </Text>
                          </View>
                        </View>

                        {shipmentQuote ? (
                          <View style={styles.deliveryQuoteCard}>
                            <Text style={styles.deliveryQuoteEyebrow}>Cotizacion estimada</Text>
                            <Text style={styles.deliveryQuoteTotal}>${shipmentQuote.total.toLocaleString('es-AR')}</Text>
                            <Text style={styles.deliveryQuoteText}>Base ${shipmentQuote.baseFee.toLocaleString('es-AR')} · distancia ${shipmentQuote.distanceFee.toLocaleString('es-AR')} · tiempo ${shipmentQuote.timeFee.toLocaleString('es-AR')} · paquete ${((shipmentQuote.weightFee + shipmentQuote.sizeSurcharge)).toLocaleString('es-AR')} · servicio ${shipmentQuote.platformFee.toLocaleString('es-AR')}</Text>
                            <Text style={styles.deliveryQuoteHint}>El monto se congela cuando un conductor acepta tu envio.</Text>
                          </View>
                        ) : null}

                        <View style={styles.deliveryFieldStack}>
                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Peso estimado *</Text>
                            <TextInput
                              value={deliveryDraft.estimatedWeight}
                              onChangeText={value => patchDeliveryDraft({ estimatedWeight: value })}
                              placeholder="Ej. 3.5"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="decimal-pad"
                              selectionColor={colors.lime}
                              style={styles.deliveryFieldInput}
                            />
                            <Text style={styles.deliveryFieldHint}>Ingresa el peso total aproximado en kilos.</Text>
                          </View>

                          <View>
                            <Text style={styles.deliveryFieldLabel}>Tamano estimado *</Text>
                            <View style={styles.deliverySizeGrid}>
                              {DELIVERY_SIZE_OPTIONS.map(option => {
                                const isActive = deliveryDraft.estimatedSize === option.id

                                return (
                                  <TouchableOpacity
                                    key={option.id}
                                    activeOpacity={0.88}
                                    style={[styles.deliverySizeCard, isActive && styles.deliverySizeCardActive]}
                                    onPress={() => patchDeliveryDraft({ estimatedSize: option.id })}
                                  >
                                    <Text style={[styles.deliverySizeTitle, isActive && styles.deliverySizeTitleActive]}>
                                      {option.label}
                                    </Text>
                                    <Text style={[styles.deliverySizeSubtitle, isActive && styles.deliverySizeSubtitleActive]}>
                                      {option.subtitle}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              })}
                            </View>
                          </View>

                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Referencia adicional</Text>
                            <TextInput
                              value={deliveryDraft.deliveryAddress}
                              onChangeText={value => patchDeliveryDraft({ deliveryAddress: value })}
                              placeholder="Piso, dpto, local o una referencia visual"
                              placeholderTextColor={colors.textMuted}
                              selectionColor={colors.lime}
                              multiline
                              textAlignVertical="top"
                              style={styles.deliveryFieldTextarea}
                            />
                          </View>

                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Notas</Text>
                            <TextInput
                              value={deliveryDraft.notes}
                              onChangeText={value => patchDeliveryDraft({ notes: value })}
                              placeholder="Fragil, no volcar, contacto alternativo o instrucciones"
                              placeholderTextColor={colors.textMuted}
                              selectionColor={colors.lime}
                              multiline
                              textAlignVertical="top"
                              style={styles.deliveryFieldTextarea}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {showDeliveryContactsStep && (
                      <View style={styles.deliverySection}>
                        <View style={styles.deliverySectionHeader}>
                          <View style={styles.deliverySectionBadge}>
                            <Ionicons name="call" size={15} color={colors.black} />
                          </View>
                          <View style={styles.deliverySectionCopy}>
                            <Text style={styles.deliverySectionTitle}>Recepcion</Text>
                            <Text style={styles.deliverySectionSubtitle}>
                              El conductor va a retirar desde tu ubicacion actual. Solo necesitamos saber quien recibe.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.deliveryWizardSummaryCard}>
                          <View style={styles.deliveryWizardSummaryRow}>
                            <Ionicons name="cube" size={15} color={colors.lime} />
                            <Text style={styles.deliveryWizardSummaryText} numberOfLines={1}>
                              {formatDeliveryWeight(deliveryDraft.estimatedWeight) || 'Peso pendiente'}
                            </Text>
                            <Text style={styles.deliveryWizardSummaryMeta}>{getDeliverySizeLabel(deliveryDraft.estimatedSize)}</Text>
                          </View>
                        </View>

                        <View style={styles.deliveryFieldStack}>
                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Fecha de envío (opcional)</Text>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={styles.datePickerButton}
                              onPress={() => setShowDatePicker(true)}
                            >
                              <Ionicons name="calendar-outline" size={16} color={deliveryDraft.preferredDate ? colors.lime : colors.textMuted} />
                              <Text style={[styles.datePickerButtonText, !!deliveryDraft.preferredDate && styles.datePickerButtonTextActive]}>
                                {deliveryDraft.preferredDate
                                  ? new Date(`${deliveryDraft.preferredDate}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                                  : 'Seleccionar fecha'}
                              </Text>
                              {deliveryDraft.preferredDate && (
                                <TouchableOpacity
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  onPress={() => patchDeliveryDraft({ preferredDate: null })}
                                >
                                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                                </TouchableOpacity>
                              )}
                            </TouchableOpacity>
                            {!deliveryDraft.preferredDate && (
                              <Text style={styles.deliveryFieldHint}>Sin fecha: se busca conductor ahora</Text>
                            )}
                            {showDatePicker && (
                              <>
                                <Calendar
                                  minDate={new Date().toISOString().split('T')[0]}
                                  markedDates={deliveryDraft.preferredDate
                                    ? { [deliveryDraft.preferredDate]: { selected: true, selectedColor: colors.lime } }
                                    : {}}
                                  onDayPress={day => {
                                    patchDeliveryDraft({ preferredDate: day.dateString })
                                    setShowDatePicker(false)
                                  }}
                                  theme={{
                                    calendarBackground: colors.surfaceElevated,
                                    dayTextColor: colors.text,
                                    textDisabledColor: colors.textMuted,
                                    monthTextColor: colors.text,
                                    arrowColor: colors.lime,
                                    todayTextColor: colors.lime,
                                    selectedDayTextColor: colors.black,
                                    selectedDayBackgroundColor: colors.lime,
                                    textSectionTitleColor: colors.textMuted,
                                  }}
                                />
                                <TouchableOpacity
                                  style={styles.datePickerIosDone}
                                  onPress={() => setShowDatePicker(false)}
                                >
                                  <Text style={styles.datePickerIosDoneText}>Cancelar</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>

                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Datos de entrega *</Text>
                            <TextInput
                              value={deliveryDraft.deliveryDetails}
                              onChangeText={value => patchDeliveryDraft({ deliveryDetails: value })}
                              placeholder="Nombre, telefono, horario o datos de recepcion"
                              placeholderTextColor={colors.textMuted}
                              selectionColor={colors.lime}
                              multiline
                              textAlignVertical="top"
                              style={styles.deliveryFieldTextarea}
                            />
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.88}
                            style={[
                              styles.deliveryDeclarationRow,
                              deliveryDraft.declarationAccepted && styles.deliveryDeclarationRowActive,
                            ]}
                            onPress={() => patchDeliveryDraft({ declarationAccepted: !deliveryDraft.declarationAccepted })}
                          >
                            <View
                              style={[
                                styles.deliveryDeclarationCheck,
                                deliveryDraft.declarationAccepted && styles.deliveryDeclarationCheckActive,
                              ]}
                            >
                              <Ionicons
                                name={deliveryDraft.declarationAccepted ? 'checkmark' : 'add'}
                                size={15}
                                color={deliveryDraft.declarationAccepted ? colors.black : colors.textMuted}
                              />
                            </View>

                            <View style={styles.deliveryDeclarationCopy}>
                              <Text style={styles.deliveryDeclarationTitle}>Declaracion jurada *</Text>
                              <Text style={styles.deliveryDeclarationText}>
                                Confirmo que los datos son reales, el paquete no contiene elementos prohibidos y acepto las condiciones del servicio.
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {showDeliveryRouteStep && (
                    <>
                      <Text style={styles.quickPlacesTitle}>Lugares rapidos</Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickPlacesRow}
                      >
                        {QUICK_DESTINATIONS.map(place => (
                          <TouchableOpacity
                            key={place.id}
                            activeOpacity={0.86}
                            style={styles.quickPlaceChip}
                            onPress={() => {
                              setDestinationSelection(null)
                              setDestinationInput(place.label)
                              setDeliveryFormError(null)
                            }}
                          >
                            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.quickPlaceChipText}>{place.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {(deliveryFormError || (serviceMessage && searchStage === 'editing')) && (
                    <View style={styles.composerNotice}>
                      <Ionicons
                        name={deliveryFormError ? 'alert-circle' : 'information-circle'}
                        size={15}
                        color={deliveryFormError ? colors.danger : colors.warning}
                      />
                      <Text style={styles.composerNoticeText}>{deliveryFormError || serviceMessage}</Text>
                    </View>
                  )}

                  {isDeliveryMode && canGoBackInWizard ? (
                    <View style={styles.deliveryWizardActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.deliveryWizardBackButton}
                        onPress={goToPreviousDeliveryWizardStep}
                        disabled={routeLoading}
                      >
                        <Ionicons name="arrow-back" size={16} color={colors.text} />
                        <Text style={styles.deliveryWizardBackButtonText}>Atras</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={[
                          styles.submitRouteButton,
                          styles.deliveryWizardPrimaryAction,
                          submitRouteDisabled && styles.submitRouteButtonDisabled,
                        ]}
                        disabled={submitRouteDisabled}
                        onPress={handleDeliveryWizardNextStep}
                      >
                        {routeLoading ? (
                          <ActivityIndicator color={colors.black} size="small" />
                        ) : (
                          <>
                            <Ionicons
                              name={deliveryWizardStep === 'contacts' ? 'navigate-circle' : 'arrow-forward-circle'}
                              size={18}
                              color={colors.black}
                            />
                            <Text style={styles.submitRouteButtonText}>{submitRouteLabel}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={[
                        styles.submitRouteButton,
                        submitRouteDisabled && styles.submitRouteButtonDisabled,
                      ]}
                      disabled={submitRouteDisabled}
                      onPress={() => {
                        if (isDeliveryMode) {
                          handleDeliveryWizardNextStep()
                          return
                        }
                        void submitSearch()
                      }}
                    >
                      {routeLoading ? (
                        <ActivityIndicator color={colors.black} size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name={isDeliveryMode ? 'arrow-forward-circle' : 'navigate-circle'}
                            size={18}
                            color={colors.black}
                          />
                          <Text style={styles.submitRouteButtonText}>{submitRouteLabel}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>

      <AppDrawer
        activePath={pathname}
        user={user}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleNavigate}
        onDriverMode={handleDriverMode}
        onLogout={handleLogout}
      />
    </View>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  resultsRightControls: {
    position: 'absolute',
    right: 16,
    gap: 10,
    zIndex: 40,
    elevation: 40,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
    borderWidth: 3,
    borderColor: colors.background,
  },
  searchMarker: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 12,
    backgroundColor: colors.mapOverlay,
  },
  searchMarkerOrigin: {
    paddingHorizontal: 0,
    backgroundColor: colors.surfaceElevated,
  },
  searchMarkerDestination: {
    paddingHorizontal: 0,
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  searchMarkerOffer: {
    minWidth: 68,
  },
  searchMarkerLabel: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  categories: {
    gap: 8,
    paddingRight: 16,
    paddingBottom: 14,
  },
  category: {
    width: 70,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  categoryText: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
  },
  categoryTextActive: {
    color: colors.black,
  },
  serviceSubtitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    marginBottom: 10,
  },
  searchBox: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
  },
  searchText: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  // ── Wizard screen (full-screen modal) ───────────────────────────────────────
  wizardScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wizardScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  wizardBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wizardHeaderTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 18,
  },
  wizardHeaderSpacer: {
    width: 40,
  },
  wizardContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  searchFieldsArea: {
    position: 'relative',
    zIndex: 8,
  },
  routeInputsStack: {
    gap: 10,
  },
  routeStepArea: {
    position: 'relative',
    zIndex: 10,
  },
  deliveryWizardProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  deliveryWizardProgressPill: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryWizardProgressPillActive: {
    backgroundColor: '#242c15',
    borderColor: colors.lime,
  },
  deliveryWizardProgressPillDone: {
    borderColor: colors.lime,
  },
  deliveryWizardProgressStep: {
    color: colors.textSubtle,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
  },
  deliveryWizardProgressStepActive: {
    color: colors.lime,
  },
  deliveryWizardProgressStepDone: {
    color: colors.lime,
  },
  deliveryWizardProgressText: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    marginTop: 4,
  },
  deliveryWizardProgressTextActive: {
    color: colors.lime,
  },
  deliveryWizardProgressTextDone: {
    color: colors.text,
  },
  deliveryWizardIntroCard: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryWizardStepEyebrow: {
    color: colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  deliveryWizardStepTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
    marginTop: 6,
  },
  deliveryWizardStepText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  suggestionsPopover: {
    position: 'absolute',
    top: 138,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  suggestionsPopoverTitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  deliverySection: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  deliverySectionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
  },
  deliverySectionCopy: {
    flex: 1,
  },
  deliverySectionTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  deliverySectionSubtitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  deliveryWizardSummaryCard: {
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    backgroundColor: colors.backgroundDeep,
  },
  deliveryWizardSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryWizardSummaryText: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  deliveryWizardSummaryMeta: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  deliveryQuoteCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  deliveryQuoteEyebrow: { color: colors.lime, fontFamily: Theme.fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  deliveryQuoteTotal: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 28, marginTop: 5 },
  deliveryQuoteText: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, lineHeight: 17, marginTop: 5 },
  deliveryQuoteHint: { color: colors.textSubtle, fontFamily: Theme.fonts.medium, fontSize: 11, lineHeight: 16, marginTop: 8 },
  deliveryFieldStack: {
    gap: 12,
  },
  deliveryFieldCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryFieldLabel: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    marginBottom: 8,
  },
  deliveryFieldInput: {
    minHeight: 22,
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    paddingVertical: 0,
  },
  deliveryFieldHint: {
    color: colors.textSubtle,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    marginTop: 6,
  },
  deliveryFieldTextarea: {
    minHeight: 60,
    color: colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 0,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerButtonText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: Theme.fonts.body,
    fontSize: 14,
  },
  datePickerButtonTextActive: {
    color: colors.text,
  },
  datePickerIosDone: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.lime,
  },
  datePickerIosDoneText: {
    color: colors.black,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 14,
  },
  deliverySizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deliverySizeCard: {
    width: '48%',
    minHeight: 74,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliverySizeCardActive: {
    backgroundColor: '#242c15',
    borderColor: colors.lime,
  },
  deliverySizeTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  deliverySizeTitleActive: {
    color: colors.lime,
  },
  deliverySizeSubtitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
  },
  deliverySizeSubtitleActive: {
    color: colors.text,
  },
  deliveryDeclarationRow: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryDeclarationRowActive: {
    borderColor: colors.lime,
  },
  deliveryDeclarationCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryDeclarationCheckActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  deliveryDeclarationCopy: {
    flex: 1,
  },
  deliveryDeclarationTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  deliveryDeclarationText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  routeInputCard: {
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeInputCardActive: {
    borderColor: colors.lime,
    backgroundColor: colors.surfaceElevated,
  },
  routeInputCopy: {
    flex: 1,
  },
  routeInputLabel: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
    marginBottom: 3,
  },
  routeInputText: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    paddingVertical: 0,
  },
  routeInputIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  suggestionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionsScroll: {
    maxHeight: 272,
  },
  suggestionLoadingRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionLoadingText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
  },
  suggestionRow: {
    minHeight: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundDeep,
  },
  suggestionCopy: {
    flex: 1,
  },
  suggestionTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  suggestionSubtitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    marginTop: 3,
  },
  suggestionDistance: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
  },
  suggestionEmptyText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  quickPlacesTitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    marginTop: 18,
    marginBottom: 10,
  },
  quickPlacesRow: {
    gap: 8,
    paddingRight: 16,
  },
  quickPlaceChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPlaceChipText: {
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  composerNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#2A2315',
  },
  composerNoticeText: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  submitRouteButton: {
    height: 50,
    borderRadius: 18,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
  },
  submitRouteButtonDisabled: {
    opacity: 0.5,
  },
  submitRouteButtonText: {
    color: colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  deliveryWizardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deliveryWizardBackButton: {
    height: 50,
    marginTop: 18,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryWizardBackButtonText: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  deliveryWizardPrimaryAction: {
    flex: 1,
  },
  resultsTopWrap: {
    position: 'absolute',
    left: 16,
    right: 68,
    zIndex: 40,
    elevation: 40,
  },
  resultBackButton: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mapOverlay,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    zIndex: 2,
  },
  routeSummaryCard: {
    marginLeft: 52,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.mapOverlay,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  routeSummaryText: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  routeSummaryBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  routeSummaryBadgeText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
  },
  routeSummaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
    marginLeft: 24,
  },
  resultsSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
    zIndex: 40,
    elevation: 40,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  serviceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#2A2315',
  },
  serviceBannerText: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  trackingPanel: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingPanelAccepted: {
    backgroundColor: '#161F16',
    borderColor: 'rgba(68,208,123,0.25)',
  },
  trackingPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trackingDriverTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trackingDriverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackingPulseWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingPulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  trackingPulseCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.lime,
  },
  trackingPanelCopy: {
    flex: 1,
  },
  trackingPanelEyebrow: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trackingPanelEyebrowSuccess: {
    color: colors.success,
  },
  trackingPanelTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
    marginTop: 3,
    lineHeight: 19,
  },
  trackingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  trackingChipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  trackingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.backgroundDeep,
  },
  trackingChipText: {
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  trackingGhostBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingGhostBtnText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
  trackingDriverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
  },
  trackingDriverAvatarText: {
    color: colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 20,
  },
  trackingDriverName: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    marginTop: 2,
  },
  trackingDriverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trackingDriverRatingText: {
    color: colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  trackingDriverRatingCount: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
  },
  trackingPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.lime,
  },
  trackingPhoneBtnText: {
    color: colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  trackingNoCoverageTop: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  trackingNoCoverageTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 2,
  },
  trackingNoCoverageBody: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  trackingPrimaryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
  },
  trackingPrimaryBtnText: {
    color: colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  deliveryRouteCard: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryRouteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginHorizontal: 3,
  },
  deliveryRouteLine: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginLeft: 6,
    marginVertical: 3,
  },
  deliveryRouteLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
  },
  deliveryRouteMeta: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  deliveryStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    marginBottom: 4,
    backgroundColor: colors.lime,
  },
  deliveryStartBtnText: {
    flex: 1,
    color: colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  promoRow: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
  },
  promoText: {
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  offerList: {
    gap: 10,
  },
  offerCard: {
    minHeight: 78,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerCardActive: {
    borderColor: colors.lime,
    backgroundColor: '#242c15',
  },
  offerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundDeep,
  },
  offerCopy: {
    flex: 1,
  },
  offerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  offerSeatBadge: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundDeep,
  },
  offerSeatBadgeText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  offerSubtitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    marginTop: 4,
  },
  offerMeta: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
    marginRight: 2,
  },
  offerPrice: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  offerEta: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  offerSelector: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerSelectorActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  autoAcceptRow: {
    minHeight: 62,
    borderRadius: 16,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceElevated,
  },
  autoAcceptCopy: {
    flex: 1,
  },
  autoAcceptTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    lineHeight: 17,
  },
  autoAcceptText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    marginTop: 4,
  },
  resultsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  findOffersButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
  },
  findOffersButtonText: {
    color: colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
})
