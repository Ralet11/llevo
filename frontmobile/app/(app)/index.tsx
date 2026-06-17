import { Ionicons } from '@expo/vector-icons'
import { Href, router, usePathname } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
import { IconButton } from '../../components/ui/IconButton'
import { darkMapStyle } from '../../constants/mapStyle'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { api, ApiError } from '../../lib/api'
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
type DeliveryRequestStatus = 'idle' | 'searching' | 'accepted' | 'no_coverage'
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
  pickupAddress: string   // dirección exacta de retiro (calle, número, piso)
  pickupContactName: string
  pickupContactPhone: string
  notes: string
  deliveryAddress: string // referencia adicional para la entrega
  deliveryDetails: string
  declarationAccepted: boolean
  preferredDate: string | null // YYYY-MM-DD, null = envío inmediato
}

type AssignedDriver = {
  name: string
  phone: string | null
  rating: number | null
  ratingCount: number
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
    title: 'Contacto y confirmacion',
    subtitle: 'Necesitamos los datos del retiro y de la recepcion antes de buscar conductor.',
    cta: 'Buscar conductor',
  },
]

const EMPTY_DELIVERY_DRAFT: DeliveryDraft = {
  estimatedWeight: '',
  estimatedSize: null,
  pickupAddress: '',
  pickupContactName: '',
  pickupContactPhone: '',
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

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
  if (!draft.pickupAddress.trim()) return 'Ingresa la dirección exacta de retiro (calle y número).'
  if (!draft.pickupContactName.trim()) return 'Ingresa tu nombre o el del contacto en origen.'
  if (!draft.pickupContactPhone.trim()) return 'Ingresa un telefono de contacto en origen.'
  if (!draft.deliveryDetails.trim()) return 'Agrega los datos de entrega.'
  if (!draft.declarationAccepted) return 'Acepta la declaracion jurada para continuar.'

  return null
}

function getPreferredDeliveryOfferId(size: DeliveryPackageSize | null): RouteOfferId {
  if (size === 'small' || size === 'medium') return 'moto'
  if (size === 'large' || size === 'bulky') return 'grupo'
  return 'economico'
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
        color={variant === 'destination' ? Theme.colors.black : Theme.colors.text}
      />
      {variant === 'offer' && <Text style={styles.searchMarkerLabel}>{label}</Text>}
    </View>
  )
}

export default function AppHomeScreen() {
  const { user, token, logout } = useAuth()
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
  const [renderSearchComposer, setRenderSearchComposer] = useState(false)
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
  const [deliveryWizardStep, setDeliveryWizardStep] = useState<DeliveryWizardStep>('route')
  const [deliveryRequestStatus, setDeliveryRequestStatus] = useState<DeliveryRequestStatus>('idle')
  const [assignedDriver, setAssignedDriver] = useState<AssignedDriver | null>(null)
  const [currentShipmentId, setCurrentShipmentId] = useState<string | null>(null)
  const [searchSessionToken, setSearchSessionToken] = useState('')
  const idleProgress = useRef(new Animated.Value(1)).current
  const searchProgress = useRef(new Animated.Value(0)).current
  const resultsProgress = useRef(new Animated.Value(0)).current
  const searchingPulse = useRef(new Animated.Value(0)).current
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const screenHeight = useRef(Dimensions.get('screen').height).current

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

  useEffect(() => {
    Animated.timing(idleProgress, {
      toValue: searchStage === 'idle' ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [idleProgress, searchStage])

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

  useEffect(() => {
    if (searchStage !== 'delivery_tracking' || !currentShipmentId || !token) return
    if (deliveryRequestStatus === 'accepted' || deliveryRequestStatus === 'no_coverage') return

    let cancelled = false

    type ShipmentPollResponse = {
      shipment: {
        status: string
        job?: {
          driver: { name: string; phone: string | null; rating: number | null; ratingCount: number }
        } | null
      }
    }

    async function poll() {
      try {
        const data = await api.get<ShipmentPollResponse>(
          `/shipments/${currentShipmentId}`,
          token!
        )
        if (cancelled) return
        if (data.shipment.status === 'ASSIGNED') {
          if (data.shipment.job?.driver) {
            const d = data.shipment.job.driver
            setAssignedDriver({ name: d.name, phone: d.phone, rating: d.rating, ratingCount: d.ratingCount })
          }
          setDeliveryRequestStatus('accepted')
        } else if (data.shipment.status === 'NO_COVERAGE') {
          setDeliveryRequestStatus('no_coverage')
        }
      } catch {
        // falla silenciosamente, reintenta en el proximo ciclo
      }
    }

    poll()
    const intervalId = setInterval(poll, 5000)

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
    // altitude ~= span * 111000 * 3.5 (rough meters above ground for iOS)
    const altMid = Math.max(3000, Math.min(span * 111000 * 3.5, 14000))
    const zoomMid = Math.max(11, Math.min(14 - Math.log2(span * 111), 14))

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
      void submitSearch()
      return
    }

    Keyboard.dismiss()
    setFocusedField(null)
    setDeliveryFormError(null)
    setDeliveryWizardStep(nextStep)
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
        originAddress: deliveryDraft.pickupAddress.trim() || nextResult.originLabel,
        deliveryAddress: [destinationInput, deliveryDraft.deliveryAddress].filter(Boolean).join(', '),
        weightKg,
        packageSize: (deliveryDraft.estimatedSize ?? 'medium').toUpperCase(),
        pickupContactName: deliveryDraft.pickupContactName || (user?.name ?? ''),
        pickupContactPhone: deliveryDraft.pickupContactPhone || (user?.phone ?? ''),
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
      setServiceMessage(err instanceof Error ? err.message : 'Error al registrar el pedido.')
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

  const statusText = {
    loading: 'Buscando tu zona...',
    device: 'Ubicacion activa',
    permission_denied: 'Permiso de ubicacion pendiente',
    services_off: 'GPS desactivado',
    error: 'Usando zona inicial',
  }[status]

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

  const idleTranslateY = idleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  })
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
        loadingBackgroundColor={Theme.colors.background}
        loadingIndicatorColor={Theme.colors.lime}
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
              strokeColor={Theme.colors.lime}
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
                <Ionicons name={marker.icon} size={16} color={Theme.colors.black} />
              </View>
            </Marker>
          ))
        )}
      </MapView>


      <View pointerEvents="box-none" style={styles.overlay}>
        <Animated.View
          pointerEvents={searchStage === 'idle' ? 'auto' : 'none'}
          renderToHardwareTextureAndroid
          style={[styles.topBar, { paddingTop: topInset + 14, opacity: idleProgress, transform: [{ translateY: idleTranslateY }] }]}
        >
          <IconButton name="menu" onPress={() => setDrawerVisible(true)} />
          <View style={styles.locationPill}>
            <View style={styles.locationCopy}>
              <View style={styles.locationHeader}>
                <View style={[styles.statusDot, status === 'device' && styles.statusDotActive]} />
                <Text style={styles.locationText}>{statusText}</Text>
              </View>
              <Text style={styles.locationAddress} numberOfLines={1}>{addressLabel}</Text>
            </View>
          </View>
        </Animated.View>

        {status !== 'device' && (
          <Animated.View
            pointerEvents={searchStage === 'idle' ? 'auto' : 'none'}
            renderToHardwareTextureAndroid
            style={[styles.permissionBanner, { opacity: idleProgress, transform: [{ translateY: idleTranslateY }] }]}
          >
            <Text style={styles.permissionTitle}>
              {status === 'permission_denied' ? 'Necesitamos tu ubicacion' : 'No pudimos centrar el mapa'}
            </Text>
            <Text style={styles.permissionText}>
              {status === 'permission_denied'
                ? 'Toca habilitar para pedir permiso o abrir ajustes si Android ya lo bloqueo.'
                : status === 'services_off'
                  ? 'Activa el GPS del telefono para mostrar tu posicion real.'
                  : 'Vamos a seguir mostrando una zona inicial hasta conseguir tu posicion.'}
            </Text>
            <TouchableOpacity activeOpacity={0.86} style={styles.permissionButton} onPress={requestLocationAgain}>
              <Text style={styles.permissionButtonText}>
                {status === 'permission_denied' ? 'Habilitar ubicacion' : 'Reintentar ubicacion'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View
          pointerEvents={searchStage === 'idle' ? 'auto' : 'none'}
          renderToHardwareTextureAndroid
          style={[styles.rightControls, { top: topInset + 126, opacity: idleProgress, transform: [{ translateY: idleTranslateY }] }]}
        >
          <IconButton name="navigate" onPress={handlePrimaryMapControl} variant="dark" />
        </Animated.View>

        <Animated.View
          pointerEvents={searchStage === 'idle' ? 'auto' : 'none'}
          renderToHardwareTextureAndroid
          style={[
            styles.bottomPanel,
            {
              paddingBottom: insets.bottom + 16,
              opacity: idleProgress,
              transform: [{ translateY: idleTranslateY }],
            },
          ]}
        >
          <Text style={styles.deliveryPromptTitle}>Que envias?</Text>
          <Text style={styles.deliveryPromptText}>
            Inicia un envio y te mostramos opciones cercanas para retiro y entrega.
          </Text>

          <TouchableOpacity activeOpacity={0.88} style={styles.deliveryPromptButton} onPress={() => openSearchComposer('idle')}>
            <Ionicons name="search" size={18} color={Theme.colors.black} />
            <Text style={styles.deliveryPromptButtonText}>Iniciar busqueda</Text>
          </TouchableOpacity>
        </Animated.View>

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
                <Ionicons name="arrow-back" size={20} color={Theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={isResultsStage ? 0.9 : 1}
                disabled={!isResultsStage}
                style={styles.routeSummaryCard}
                onPress={isResultsStage ? () => openSearchComposer('results') : undefined}
              >
                <View style={styles.routeSummaryRow}>
                  <Ionicons name="locate" size={15} color={Theme.colors.text} />
                  <Text style={styles.routeSummaryText} numberOfLines={1}>{routeResult.originLabel}</Text>
                  <View style={styles.routeSummaryBadge}>
                    <Text style={styles.routeSummaryBadgeText}>{routeResult.distanceLabel}</Text>
                  </View>
                </View>

                <View style={styles.routeSummaryDivider} />

                <View style={styles.routeSummaryRow}>
                  <Ionicons name="flag" size={15} color={Theme.colors.lime} />
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
                  <Ionicons name="information-circle" size={16} color={Theme.colors.warning} />
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
                          <Ionicons name="cube-outline" size={13} color={Theme.colors.lime} />
                          <Text style={styles.trackingChipText}>{formatDeliveryWeight(deliveryDraft.estimatedWeight)}</Text>
                        </View>
                        <View style={styles.trackingChip}>
                          <Ionicons name="resize-outline" size={13} color={Theme.colors.lime} />
                          <Text style={styles.trackingChipText}>{getDeliverySizeLabel(deliveryDraft.estimatedSize)}</Text>
                        </View>
                      </View>

                      <TouchableOpacity style={styles.trackingGhostBtn} activeOpacity={0.8} onPress={closeSearchComposer}>
                        <Text style={styles.trackingGhostBtnText}>Cancelar búsqueda</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {deliveryRequestStatus === 'accepted' && (
                    <View style={[styles.trackingPanel, styles.trackingPanelAccepted]}>
                      <View style={styles.trackingPanelHeader}>
                        <View style={styles.trackingDriverAvatar}>
                          <Text style={styles.trackingDriverAvatarText}>
                            {(assignedDriver?.name ?? 'C').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.trackingPanelCopy}>
                          <Text style={[styles.trackingPanelEyebrow, styles.trackingPanelEyebrowSuccess]}>
                            ¡Conductor asignado!
                          </Text>
                          <Text style={styles.trackingDriverName}>{assignedDriver?.name ?? 'En camino'}</Text>
                          {assignedDriver?.rating !== null && assignedDriver?.rating !== undefined && (
                            <View style={styles.trackingDriverRatingRow}>
                              <Ionicons name="star" size={11} color={Theme.colors.lime} />
                              <Text style={styles.trackingDriverRatingText}>{assignedDriver.rating.toFixed(1)}</Text>
                              {assignedDriver.ratingCount > 0 && (
                                <Text style={styles.trackingDriverRatingCount}>
                                  ({assignedDriver.ratingCount} viajes)
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                        {assignedDriver?.phone && (
                          <TouchableOpacity
                            style={styles.trackingPhoneBtn}
                            activeOpacity={0.8}
                            onPress={() => Linking.openURL(`tel:${assignedDriver.phone}`)}
                          >
                            <Ionicons name="call" size={16} color={Theme.colors.black} />
                            <Text style={styles.trackingPhoneBtnText}>Llamar</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.trackingDivider} />

                      <View style={styles.trackingChipRow}>
                        <View style={styles.trackingChip}>
                          <Ionicons name="cube-outline" size={13} color={Theme.colors.lime} />
                          <Text style={styles.trackingChipText}>{formatDeliveryWeight(deliveryDraft.estimatedWeight)}</Text>
                        </View>
                        <View style={styles.trackingChip}>
                          <Ionicons name="resize-outline" size={13} color={Theme.colors.lime} />
                          <Text style={styles.trackingChipText}>{getDeliverySizeLabel(deliveryDraft.estimatedSize)}</Text>
                        </View>
                        {deliveryDraft.deliveryDetails ? (
                          <View style={[styles.trackingChip, { flex: 1 }]}>
                            <Ionicons name="location-outline" size={13} color={Theme.colors.lime} />
                            <Text style={[styles.trackingChipText, { flex: 1 }]} numberOfLines={1}>
                              {deliveryDraft.deliveryDetails}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {deliveryRequestStatus === 'no_coverage' && (
                    <View style={styles.trackingPanel}>
                      <View style={styles.trackingNoCoverageTop}>
                        <Ionicons name="alert-circle" size={30} color={Theme.colors.warning} />
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
                      <Ionicons name="location" size={14} color={Theme.colors.lime} />
                      <Text style={styles.deliveryRouteLabel} numberOfLines={1}>{routeResult.destinationLabel}</Text>
                      <Text style={styles.deliveryRouteMeta}>{routeResult.durationLabel}</Text>
                    </View>
                  </View>

                  <TouchableOpacity activeOpacity={0.88} style={styles.deliveryStartBtn} onPress={handleOfferCTA}>
                    <Ionicons name="cube-outline" size={18} color={Theme.colors.black} />
                    <Text style={styles.deliveryStartBtnText}>Configurar entrega</Text>
                    <Ionicons name="arrow-forward" size={16} color={Theme.colors.black} />
                  </TouchableOpacity>
                </>
              ) : isResultsStage ? (
                <>
                  <TouchableOpacity activeOpacity={0.86} style={styles.promoRow}>
                    <Text style={styles.promoText}>Tenes un codigo promocional? Usalo</Text>
                    <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} />
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
                            <Ionicons name={offer.icon} size={18} color={Theme.colors.lime} />
                          </View>

                          <View style={styles.offerCopy}>
                            <View style={styles.offerHeaderRow}>
                              <Text style={styles.offerTitle}>{offer.title}</Text>
                              <View style={styles.offerSeatBadge}>
                                <Ionicons name="person" size={11} color={Theme.colors.textMuted} />
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
                              color={isActive ? Theme.colors.black : Theme.colors.text}
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
                      thumbColor={autoAccept ? Theme.colors.black : Theme.colors.text}
                      trackColor={{ false: Theme.colors.surfaceMuted, true: Theme.colors.lime }}
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

        <Modal
          visible={searchStage === 'editing'}
          animationType="slide"
          onRequestClose={closeSearchComposer}
        >
          <View style={styles.wizardScreen}>
            <View style={[styles.wizardScreenHeader, { paddingTop: topInset + 8 }]}>
              <TouchableOpacity style={styles.wizardBackBtn} onPress={closeSearchComposer} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color={Theme.colors.text} />
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
                            <Ionicons name="locate" size={16} color={Theme.colors.textMuted} />
                            <Pressable style={styles.routeInputCopy} onPress={() => originInputRef.current?.focus()}>
                              <Text style={styles.routeInputLabel}>De</Text>
                              <TextInput
                                ref={originInputRef}
                                value={originInput}
                                onChangeText={updateOriginValue}
                                placeholder="Tu ubicacion actual"
                                placeholderTextColor={Theme.colors.textMuted}
                                style={styles.routeInputText}
                                selectionColor={Theme.colors.lime}
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
                              <Ionicons name="navigate" size={16} color={Theme.colors.text} />
                            </TouchableOpacity>
                          </View>

                          <View style={[styles.routeInputCard, focusedField === 'destination' && styles.routeInputCardActive]}>
                            <Ionicons name="search" size={16} color={Theme.colors.textMuted} />
                            <Pressable style={styles.routeInputCopy} onPress={() => destinationInputRef.current?.focus()}>
                              <Text style={styles.routeInputLabel}>A</Text>
                              <TextInput
                                ref={destinationInputRef}
                                value={destinationInput}
                                onChangeText={updateDestinationValue}
                                placeholder={destinationPlaceholder}
                                placeholderTextColor={Theme.colors.textMuted}
                                style={styles.routeInputText}
                                selectionColor={Theme.colors.lime}
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
                              <Ionicons name={isDeliveryMode ? 'arrow-forward' : 'sparkles'} size={16} color={Theme.colors.text} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {showSuggestions && (
                          <View style={styles.suggestionsPopover}>
                            <Text style={styles.suggestionsPopoverTitle}>Sugerencias</Text>

                            <View style={styles.suggestionsCard}>
                              {suggestionsLoading ? (
                                <View style={styles.suggestionLoadingRow}>
                                  <ActivityIndicator color={Theme.colors.lime} size="small" />
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
                                        <Ionicons name="location-outline" size={16} color={Theme.colors.lime} />
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
                            <Ionicons name="cube" size={15} color={Theme.colors.black} />
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
                            <Ionicons name="flag" size={15} color={Theme.colors.lime} />
                            <Text style={styles.deliveryWizardSummaryText} numberOfLines={1}>
                              {destinationInput.trim() || 'Destino pendiente'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.deliveryFieldStack}>
                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Peso estimado *</Text>
                            <TextInput
                              value={deliveryDraft.estimatedWeight}
                              onChangeText={value => patchDeliveryDraft({ estimatedWeight: value })}
                              placeholder="Ej. 3.5"
                              placeholderTextColor={Theme.colors.textMuted}
                              keyboardType="decimal-pad"
                              selectionColor={Theme.colors.lime}
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
                              placeholderTextColor={Theme.colors.textMuted}
                              selectionColor={Theme.colors.lime}
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
                              placeholderTextColor={Theme.colors.textMuted}
                              selectionColor={Theme.colors.lime}
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
                            <Ionicons name="call" size={15} color={Theme.colors.black} />
                          </View>
                          <View style={styles.deliverySectionCopy}>
                            <Text style={styles.deliverySectionTitle}>Retiro y recepcion</Text>
                            <Text style={styles.deliverySectionSubtitle}>
                              Estos datos los usa el conductor para coordinar la entrega sin demoras.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.deliveryWizardSummaryCard}>
                          <View style={styles.deliveryWizardSummaryRow}>
                            <Ionicons name="cube" size={15} color={Theme.colors.lime} />
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
                              <Ionicons name="calendar-outline" size={16} color={deliveryDraft.preferredDate ? Theme.colors.lime : Theme.colors.textMuted} />
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
                                  <Ionicons name="close-circle" size={16} color={Theme.colors.textMuted} />
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
                                    ? { [deliveryDraft.preferredDate]: { selected: true, selectedColor: Theme.colors.lime } }
                                    : {}}
                                  onDayPress={day => {
                                    patchDeliveryDraft({ preferredDate: day.dateString })
                                    setShowDatePicker(false)
                                  }}
                                  theme={{
                                    calendarBackground: Theme.colors.surfaceElevated,
                                    dayTextColor: Theme.colors.text,
                                    textDisabledColor: Theme.colors.textMuted,
                                    monthTextColor: Theme.colors.text,
                                    arrowColor: Theme.colors.lime,
                                    todayTextColor: Theme.colors.lime,
                                    selectedDayTextColor: Theme.colors.black,
                                    selectedDayBackgroundColor: Theme.colors.lime,
                                    textSectionTitleColor: Theme.colors.textMuted,
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
                            <Text style={styles.deliveryFieldLabel}>Dirección exacta de retiro *</Text>
                            <TextInput
                              value={deliveryDraft.pickupAddress}
                              onChangeText={value => patchDeliveryDraft({ pickupAddress: value })}
                              placeholder="Calle, número, piso/depto"
                              placeholderTextColor={Theme.colors.textMuted}
                              selectionColor={Theme.colors.lime}
                              style={styles.deliveryFieldInput}
                            />
                          </View>

                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Nombre contacto en origen *</Text>
                            <TextInput
                              value={deliveryDraft.pickupContactName}
                              onChangeText={value => patchDeliveryDraft({ pickupContactName: value })}
                              placeholder={user?.name ?? 'Tu nombre'}
                              placeholderTextColor={Theme.colors.textMuted}
                              selectionColor={Theme.colors.lime}
                              style={styles.deliveryFieldInput}
                            />
                          </View>

                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Telefono contacto en origen *</Text>
                            <TextInput
                              value={deliveryDraft.pickupContactPhone}
                              onChangeText={value => patchDeliveryDraft({ pickupContactPhone: value })}
                              placeholder={user?.phone ?? '11 1234-5678'}
                              placeholderTextColor={Theme.colors.textMuted}
                              selectionColor={Theme.colors.lime}
                              keyboardType="phone-pad"
                              style={styles.deliveryFieldInput}
                            />
                          </View>

                          <View style={styles.deliveryFieldCard}>
                            <Text style={styles.deliveryFieldLabel}>Datos de entrega *</Text>
                            <TextInput
                              value={deliveryDraft.deliveryDetails}
                              onChangeText={value => patchDeliveryDraft({ deliveryDetails: value })}
                              placeholder="Nombre, telefono, horario o datos de recepcion"
                              placeholderTextColor={Theme.colors.textMuted}
                              selectionColor={Theme.colors.lime}
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
                                color={deliveryDraft.declarationAccepted ? Theme.colors.black : Theme.colors.textMuted}
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
                            <Ionicons name="location-outline" size={14} color={Theme.colors.textMuted} />
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
                        color={deliveryFormError ? Theme.colors.danger : Theme.colors.warning}
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
                        <Ionicons name="arrow-back" size={16} color={Theme.colors.text} />
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
                          <ActivityIndicator color={Theme.colors.black} size="small" />
                        ) : (
                          <>
                            <Ionicons
                              name={deliveryWizardStep === 'contacts' ? 'navigate-circle' : 'arrow-forward-circle'}
                              size={18}
                              color={Theme.colors.black}
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
                        <ActivityIndicator color={Theme.colors.black} size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name={isDeliveryMode ? 'arrow-forward-circle' : 'navigate-circle'}
                            size={18}
                            color={Theme.colors.black}
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
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 30,
    elevation: 30,
  },
  locationPill: {
    maxWidth: '76%',
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.mapOverlay,
    borderWidth: 1,
    borderColor: Theme.colors.borderSoft,
  },
  locationCopy: {
    flexShrink: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.warning,
  },
  statusDotActive: {
    backgroundColor: Theme.colors.lime,
  },
  locationText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
  },
  locationAddress: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    marginTop: 2,
    flexShrink: 1,
  },
  permissionBanner: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Theme.colors.mapOverlay,
    borderWidth: 1,
    borderColor: Theme.colors.borderSoft,
    zIndex: 30,
    elevation: 30,
  },
  permissionTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  permissionText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  permissionButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  permissionButtonText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  rightControls: {
    position: 'absolute',
    right: 16,
    gap: 10,
    zIndex: 30,
    elevation: 30,
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
    backgroundColor: Theme.colors.lime,
    borderWidth: 3,
    borderColor: Theme.colors.background,
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
    borderColor: Theme.colors.borderSoft,
    paddingHorizontal: 12,
    backgroundColor: Theme.colors.mapOverlay,
  },
  searchMarkerOrigin: {
    paddingHorizontal: 0,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  searchMarkerDestination: {
    paddingHorizontal: 0,
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
  searchMarkerOffer: {
    minWidth: 68,
  },
  searchMarkerLabel: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
    zIndex: 30,
    elevation: 30,
  },
  deliveryPromptTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  deliveryPromptText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  deliveryPromptButton: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Theme.colors.lime,
  },
  deliveryPromptButtonText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
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
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  categoryActive: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
  categoryText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
  },
  categoryTextActive: {
    color: Theme.colors.black,
  },
  serviceSubtitle: {
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.surfaceMuted,
  },
  searchText: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  // ── Wizard screen (full-screen modal) ───────────────────────────────────────
  wizardScreen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  wizardScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderSoft,
  },
  wizardBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  wizardHeaderTitle: {
    flex: 1,
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliveryWizardProgressPillActive: {
    backgroundColor: '#242c15',
    borderColor: Theme.colors.lime,
  },
  deliveryWizardProgressPillDone: {
    borderColor: Theme.colors.lime,
  },
  deliveryWizardProgressStep: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
  },
  deliveryWizardProgressStepActive: {
    color: Theme.colors.lime,
  },
  deliveryWizardProgressStepDone: {
    color: Theme.colors.lime,
  },
  deliveryWizardProgressText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    marginTop: 4,
  },
  deliveryWizardProgressTextActive: {
    color: Theme.colors.lime,
  },
  deliveryWizardProgressTextDone: {
    color: Theme.colors.text,
  },
  deliveryWizardIntroCard: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliveryWizardStepEyebrow: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  deliveryWizardStepTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
    marginTop: 6,
  },
  deliveryWizardStepText: {
    color: Theme.colors.textMuted,
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
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  deliverySection: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.lime,
  },
  deliverySectionCopy: {
    flex: 1,
  },
  deliverySectionTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  deliverySectionSubtitle: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.backgroundDeep,
  },
  deliveryWizardSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryWizardSummaryText: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  deliveryWizardSummaryMeta: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  deliveryFieldStack: {
    gap: 12,
  },
  deliveryFieldCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliveryFieldLabel: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    marginBottom: 8,
  },
  deliveryFieldInput: {
    minHeight: 22,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    paddingVertical: 0,
  },
  deliveryFieldHint: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    marginTop: 6,
  },
  deliveryFieldTextarea: {
    minHeight: 60,
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.backgroundDeep,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  datePickerButtonText: {
    flex: 1,
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.body,
    fontSize: 14,
  },
  datePickerButtonTextActive: {
    color: Theme.colors.text,
  },
  datePickerIosDone: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Theme.colors.lime,
  },
  datePickerIosDoneText: {
    color: Theme.colors.black,
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
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliverySizeCardActive: {
    backgroundColor: '#242c15',
    borderColor: Theme.colors.lime,
  },
  deliverySizeTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  deliverySizeTitleActive: {
    color: Theme.colors.lime,
  },
  deliverySizeSubtitle: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
  },
  deliverySizeSubtitleActive: {
    color: Theme.colors.text,
  },
  deliveryDeclarationRow: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliveryDeclarationRowActive: {
    borderColor: Theme.colors.lime,
  },
  deliveryDeclarationCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliveryDeclarationCheckActive: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
  deliveryDeclarationCopy: {
    flex: 1,
  },
  deliveryDeclarationTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  deliveryDeclarationText: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  routeInputCardActive: {
    borderColor: Theme.colors.lime,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  routeInputCopy: {
    flex: 1,
  },
  routeInputLabel: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
    marginBottom: 3,
  },
  routeInputText: {
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.surfaceElevated,
  },
  suggestionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
    color: Theme.colors.textMuted,
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
    borderBottomColor: Theme.colors.border,
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
  },
  suggestionCopy: {
    flex: 1,
  },
  suggestionTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  suggestionSubtitle: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    marginTop: 3,
  },
  suggestionDistance: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
  },
  suggestionEmptyText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  quickPlacesTitle: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  quickPlaceChipText: {
    color: Theme.colors.text,
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
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.lime,
  },
  submitRouteButtonDisabled: {
    opacity: 0.5,
  },
  submitRouteButtonText: {
    color: Theme.colors.black,
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
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deliveryWizardBackButtonText: {
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.mapOverlay,
    borderWidth: 1,
    borderColor: Theme.colors.borderSoft,
    zIndex: 2,
  },
  routeSummaryCard: {
    marginLeft: 52,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Theme.colors.mapOverlay,
    borderWidth: 1,
    borderColor: Theme.colors.borderSoft,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  routeSummaryText: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  routeSummaryBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceMuted,
  },
  routeSummaryBadgeText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
  },
  routeSummaryDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.background,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
    zIndex: 40,
    elevation: 40,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.border,
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
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  trackingPanel: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
    borderColor: Theme.colors.lime,
  },
  trackingPulseCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Theme.colors.lime,
  },
  trackingPanelCopy: {
    flex: 1,
  },
  trackingPanelEyebrow: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trackingPanelEyebrowSuccess: {
    color: Theme.colors.success,
  },
  trackingPanelTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
    marginTop: 3,
    lineHeight: 19,
  },
  trackingDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.backgroundDeep,
  },
  trackingChipText: {
    color: Theme.colors.text,
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
    borderColor: Theme.colors.border,
  },
  trackingGhostBtnText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
  trackingDriverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  trackingDriverAvatarText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 20,
  },
  trackingDriverName: {
    color: Theme.colors.text,
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
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  trackingDriverRatingCount: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.lime,
  },
  trackingPhoneBtnText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  trackingNoCoverageTop: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  trackingNoCoverageTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 2,
  },
  trackingNoCoverageBody: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.lime,
  },
  trackingPrimaryBtnText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  deliveryRouteCard: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.textMuted,
    marginHorizontal: 3,
  },
  deliveryRouteLine: {
    width: 1,
    height: 14,
    backgroundColor: Theme.colors.border,
    marginLeft: 6,
    marginVertical: 3,
  },
  deliveryRouteLabel: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
  },
  deliveryRouteMeta: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.lime,
  },
  deliveryStartBtnText: {
    flex: 1,
    color: Theme.colors.black,
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
    backgroundColor: Theme.colors.surfaceElevated,
  },
  promoText: {
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  offerCardActive: {
    borderColor: Theme.colors.lime,
    backgroundColor: '#242c15',
  },
  offerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
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
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.backgroundDeep,
  },
  offerSeatBadgeText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  offerSubtitle: {
    color: Theme.colors.textMuted,
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
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  offerEta: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.backgroundDeep,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  offerSelectorActive: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
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
    backgroundColor: Theme.colors.surfaceElevated,
  },
  autoAcceptCopy: {
    flex: 1,
  },
  autoAcceptTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    lineHeight: 17,
  },
  autoAcceptText: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.lime,
  },
  findOffersButtonText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
})
