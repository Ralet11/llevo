import { Ionicons } from '@expo/vector-icons'
import { Href, router, usePathname } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppDrawer } from '../../components/app/AppDrawer'
import { IconButton } from '../../components/ui/IconButton'
import { darkMapStyle } from '../../constants/mapStyle'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
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
type SearchStage = 'idle' | 'editing' | 'results'
type SearchReturnStage = 'idle' | 'results'
type SearchField = 'origin' | 'destination'
type RouteOfferId = 'economico' | 'moto' | 'grupo'

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

const CATEGORIES: { id: ServiceMode; label: string; icon: IconName; subtitle: string }[] = [
  { id: 'moto', label: 'Moto', icon: 'bicycle', subtitle: 'Rider, delivery o recados' },
  { id: 'viaje', label: 'Viaje', icon: 'car-sport', subtitle: 'Sumarte a un viaje' },
  { id: 'entrega', label: 'Entrega', icon: 'cube', subtitle: 'Entrega a larga distancia' },
]

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
  const { user, logout } = useAuth()
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
  const [selectedCategory, setSelectedCategory] = useState<ServiceMode>('viaje')
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
  const [searchSessionToken, setSearchSessionToken] = useState('')
  const idleProgress = useRef(new Animated.Value(1)).current
  const searchProgress = useRef(new Animated.Value(0)).current
  const resultsProgress = useRef(new Animated.Value(0)).current

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
    if (searchStage === 'results') {
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
        bottom: insets.bottom + 326,
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
    setSearchReturnStage(returnStage)
    setServiceMessage(null)
    setOriginInput(routeResult?.originLabel ?? currentLocationLabel)
    setDestinationInput(routeResult?.destinationLabel ?? destinationInput)
    setFocusedField('destination')
    setSearchStage('editing')
    setSearchSessionToken(createSessionToken())

    requestAnimationFrame(() => {
      setTimeout(() => {
        destinationInputRef.current?.focus()
      }, 120)
    })
  }

  function closeSearchComposer() {
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
    setSelectedOfferId('economico')
    setServiceMessage(null)
    centerMap()
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

  async function submitSearch(options?: { origin?: PlaceSuggestion | null; destination?: PlaceSuggestion | null }) {
    if (routeLoading) return

    const nextOriginValue = originInput.trim() || currentLocationLabel
    const nextDestinationValue = destinationInput.trim()
    if (!nextDestinationValue) return

    Keyboard.dismiss()
    setRouteLoading(true)
    setServiceMessage(null)

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
      })

      const nextResult = buildLiveSearchResult(route)
      setOriginSelection(resolvedOrigin)
      setDestinationSelection(resolvedDestination)
      setOriginInput(nextResult.originLabel)
      setDestinationInput(nextResult.destinationLabel)
      setRouteResult(nextResult)
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
      setSelectedOfferId(fallbackResult.offers[0]?.id ?? 'economico')
      setSearchReturnStage('results')
      setFocusedField(null)
      setSearchStage('results')
      setServiceMessage(
        error instanceof Error
          ? `${error.message}. Mostrando una ruta aproximada hasta configurar Google Maps.`
          : 'Mostrando una ruta aproximada hasta configurar Google Maps.'
      )

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

    Alert.alert(
      'Oferta lista',
      `${selectedOffer.title} desde ${formatPrice(selectedOffer.price)} para ir de ${routeResult.originLabel} a ${routeResult.destinationLabel}.`
    )
  }

  function handleSuggestionPress(suggestion: PlaceSuggestion) {
    if (focusedField === 'origin') {
      setOriginSelection(suggestion)
      setOriginInput(suggestion.text)
      setActiveSuggestions([])
      requestAnimationFrame(() => {
        destinationInputRef.current?.focus()
        setFocusedField('destination')
      })
      return
    }

    setDestinationSelection(suggestion)
    setDestinationInput(suggestion.text)
    setActiveSuggestions([])
    void submitSearch({ destination: suggestion })
  }

  const statusText = {
    loading: 'Buscando tu zona...',
    device: 'Ubicacion activa',
    permission_denied: 'Permiso de ubicacion pendiente',
    services_off: 'GPS desactivado',
    error: 'Usando zona inicial',
  }[status]

  const activeCategory = CATEGORIES.find(category => category.id === selectedCategory) ?? CATEGORIES[1]
  const visibleMarkers = MAP_MARKERS.filter(marker => marker.category === selectedCategory)
  const showingRoute = routeResult !== null
  const activeOffer = routeResult?.offers.find(offer => offer.id === selectedOfferId) ?? routeResult?.offers[0] ?? null
  const activeQuery = focusedField === 'origin' ? originInput : destinationInput

  const idleTranslateY = idleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  })
  const searchComposerTranslateY = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  })
  const searchComposerScale = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
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
        showsBuildings
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={status === 'device'}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
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
                  bottom: insets.bottom + (showingRoute ? 316 : 258),
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

            {routeResult.offers.map(offer => (
              <Marker key={offer.id} coordinate={offer.marker} anchor={{ x: 0.5, y: 0.5 }}>
                <SearchMarker icon={offer.icon} label={offer.title} variant="offer" />
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {CATEGORIES.map(category => {
              const isActive = category.id === selectedCategory

              return (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[styles.category, isActive && styles.categoryActive]}
                >
                  <Ionicons
                    name={category.icon}
                    size={19}
                    color={isActive ? Theme.colors.black : Theme.colors.text}
                  />
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <Text style={styles.serviceSubtitle}>{activeCategory.subtitle}</Text>

          <TouchableOpacity activeOpacity={0.86} style={styles.searchBox} onPress={() => openSearchComposer('idle')}>
            <Ionicons name="search" size={20} color={Theme.colors.text} />
            <Text style={styles.searchText}>Donde y cuando?</Text>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {renderResultsChrome && routeResult && (
          <>
            <Animated.View
              pointerEvents={searchStage === 'results' ? 'auto' : 'none'}
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

              <TouchableOpacity activeOpacity={0.9} style={styles.routeSummaryCard} onPress={() => openSearchComposer('results')}>
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
              pointerEvents={searchStage === 'results' ? 'auto' : 'none'}
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
              <IconButton name="options-outline" onPress={() => openSearchComposer('results')} variant="dark" />
            </Animated.View>

            <Animated.View
              pointerEvents={searchStage === 'results' ? 'auto' : 'none'}
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
                  <Text style={styles.findOffersButtonText}>Encontrar ofertas</Text>
                </TouchableOpacity>
                <IconButton name="funnel-outline" onPress={() => openSearchComposer('results')} variant="light" />
              </View>
            </Animated.View>
          </>
        )}

        {renderSearchComposer && (
          <Animated.View
            pointerEvents={searchStage === 'editing' ? 'auto' : 'none'}
            style={[styles.searchOverlay, { opacity: searchProgress }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSearchComposer} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.searchOverlayKeyboard}>
              <Animated.View
                renderToHardwareTextureAndroid
                style={[
                  styles.searchComposerCard,
                  {
                    marginTop: topInset + 12,
                    transform: [
                      { translateY: searchComposerTranslateY },
                      { scale: searchComposerScale },
                    ],
                  },
                ]}
              >
                <View style={styles.searchComposerHeader}>
                  <Text style={styles.searchComposerTitle}>Introduce tu ruta</Text>
                  <IconButton name="close" onPress={closeSearchComposer} style={styles.searchComposerClose} />
                </View>

                <View style={styles.routeInputsStack}>
                  <View style={[styles.routeInputCard, focusedField === 'origin' && styles.routeInputCardActive]}>
                    <Ionicons name="locate" size={16} color={Theme.colors.textMuted} />
                    <View style={styles.routeInputCopy}>
                      <Text style={styles.routeInputLabel}>De</Text>
                      <TextInput
                        ref={originInputRef}
                        value={originInput}
                        onChangeText={updateOriginValue}
                        placeholder="Tu ubicacion actual"
                        placeholderTextColor={Theme.colors.textMuted}
                        style={styles.routeInputText}
                        selectionColor={Theme.colors.lime}
                        onFocus={() => setFocusedField('origin')}
                        onBlur={() => setFocusedField(null)}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                          destinationInputRef.current?.focus()
                          setFocusedField('destination')
                        }}
                      />
                    </View>
                    <TouchableOpacity activeOpacity={0.82} style={styles.routeInputIconButton} onPress={() => {
                      setOriginSelection(null)
                      setOriginInput(currentLocationLabel)
                    }}>
                      <Ionicons name="navigate" size={16} color={Theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.routeInputCard, focusedField === 'destination' && styles.routeInputCardActive]}>
                    <Ionicons name="search" size={16} color={Theme.colors.textMuted} />
                    <View style={styles.routeInputCopy}>
                      <Text style={styles.routeInputLabel}>A</Text>
                      <TextInput
                        ref={destinationInputRef}
                        value={destinationInput}
                        onChangeText={updateDestinationValue}
                        placeholder="A donde vas?"
                        placeholderTextColor={Theme.colors.textMuted}
                        style={styles.routeInputText}
                        selectionColor={Theme.colors.lime}
                        returnKeyType="search"
                        onFocus={() => setFocusedField('destination')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={() => void submitSearch()}
                      />
                    </View>
                    <TouchableOpacity activeOpacity={0.82} style={styles.routeInputIconButton} onPress={() => void submitSearch()}>
                      <Ionicons name="sparkles" size={16} color={Theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {activeQuery.trim().length >= 2 && !isCurrentLocationQuery(activeQuery, currentLocationLabel) && (
                  <View style={styles.suggestionsSection}>
                    <Text style={styles.quickPlacesTitle}>Sugerencias</Text>

                    <View style={styles.suggestionsCard}>
                      {suggestionsLoading ? (
                        <View style={styles.suggestionLoadingRow}>
                          <ActivityIndicator color={Theme.colors.lime} size="small" />
                          <Text style={styles.suggestionLoadingText}>Buscando lugares...</Text>
                        </View>
                      ) : activeSuggestions.length > 0 ? (
                        activeSuggestions.map(suggestion => (
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
                        ))
                      ) : (
                        <Text style={styles.suggestionEmptyText}>No aparecieron sugerencias para esa busqueda todavia.</Text>
                      )}
                    </View>
                  </View>
                )}

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
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color={Theme.colors.textMuted} />
                      <Text style={styles.quickPlaceChipText}>{place.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {serviceMessage && searchStage === 'editing' && (
                  <View style={styles.composerNotice}>
                    <Ionicons name="information-circle" size={15} color={Theme.colors.warning} />
                    <Text style={styles.composerNoticeText}>{serviceMessage}</Text>
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.submitRouteButton,
                    (!destinationInput.trim() || routeLoading) && styles.submitRouteButtonDisabled,
                  ]}
                  disabled={!destinationInput.trim() || routeLoading}
                  onPress={() => void submitSearch()}
                >
                  {routeLoading ? (
                    <ActivityIndicator color={Theme.colors.black} size="small" />
                  ) : (
                    <>
                      <Ionicons name="navigate-circle" size={18} color={Theme.colors.black} />
                      <Text style={styles.submitRouteButtonText}>Ver ofertas</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </KeyboardAvoidingView>
          </Animated.View>
        )}
      </View>

      <AppDrawer
        activePath={pathname}
        user={user}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleNavigate}
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
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  searchOverlayKeyboard: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchComposerCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchComposerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchComposerTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 20,
  },
  searchComposerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  routeInputsStack: {
    gap: 10,
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
    shadowColor: Theme.colors.lime,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
  suggestionsSection: {
    marginTop: 18,
  },
  suggestionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
