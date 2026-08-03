import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Platform, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { darkMapStyle } from '../../constants/mapStyle'
import { Theme } from '../../constants/theme'
import { themedStyles } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { computeRoutePreview, decodePolyline, type RouteStep } from '../../lib/maps'
import { DEFAULT_MAP_REGION, getInitialMapRegion, watchDriverPosition, type DriverPositionFix } from '../../lib/location'
import {
  buildCumulativePolyline,
  buildStepBoundaries,
  computeNavProgress,
  formatDistance,
  formatEtaMinutes,
  getManeuverIcon,
  resolveHeading,
  shouldTriggerReroute,
  updateOffRouteSince,
  type CumulativePoint,
  type RerouteState,
} from '../../lib/navigation'

type ActiveJob = {
  id: string
  pickedUpAt: string | null
  deliveredAt: string | null
  shipment: {
    id: string
    originCity: string
    destinationCity: string
    originAddress: string
    deliveryAddress: string
    weightKg: number
    packageSize: string
    pickupContactName: string
    pickupContactPhone: string
    recipientDetails: string
    notes: string | null
    status: string
  }
  route: {
    vehicleType: string
    licensePlate: string | null
    vehicleModel: string | null
    vehicleColor: string | null
  }
}

type NavMode = 'overview' | 'navigating'

const NAV_CAMERA_PITCH = 58
const NAV_CAMERA_ZOOM = 17.7
const NAV_CAMERA_ALTITUDE = 200
const NAV_CAMERA_DURATION_MS = 850
const MIN_HEADING_DELTA_DEG = 3

function headingDelta(a: number, b: number) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function JobMarker({ type }: { type: 'pickup' | 'delivery' }) {
  return (
    <View style={[styles.mapMarker, type === 'delivery' && styles.mapMarkerDelivery]}>
      <Ionicons
        name={type === 'pickup' ? 'locate' : 'flag'}
        size={15}
        color={type === 'pickup' ? Theme.colors.text : Theme.colors.black}
      />
    </View>
  )
}

function ManeuverBanner({ rerouting, step, distanceToNextManeuverMeters }: {
  rerouting: boolean
  step: RouteStep | null
  distanceToNextManeuverMeters: number
}) {
  if (rerouting) {
    return (
      <View style={styles.maneuverBanner}>
        <ActivityIndicator size="small" color={Theme.colors.black} />
        <Text style={styles.maneuverText} numberOfLines={1}>Recalculando ruta...</Text>
      </View>
    )
  }

  if (!step) return null

  return (
    <View style={styles.maneuverBanner}>
      <View style={styles.maneuverIconWrap}>
        <Ionicons name={getManeuverIcon(step.maneuver)} size={22} color={Theme.colors.black} />
      </View>
      <View style={styles.maneuverCopy}>
        <Text style={styles.maneuverDistance}>{formatDistance(distanceToNextManeuverMeters)}</Text>
        <Text style={styles.maneuverText} numberOfLines={2}>{step.instruction || 'Segui derecho'}</Text>
      </View>
    </View>
  )
}

export default function DriverJobScreen() {
  const { token } = useAuth()
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0)
  const mapRef = useRef<MapView>(null)

  const [job, setJob] = useState<ActiveJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([])
  const [steps, setSteps] = useState<RouteStep[]>([])
  const [originPoint, setOriginPoint] = useState<LatLng | null>(null)
  const [deliveryPoint, setDeliveryPoint] = useState<LatLng | null>(null)
  const [conductorLocation, setConductorLocation] = useState<LatLng | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  const [navMode, setNavMode] = useState<NavMode>('overview')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [distanceToNextManeuverMeters, setDistanceToNextManeuverMeters] = useState(0)
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(0)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [rerouting, setRerouting] = useState(false)

  const offRouteSinceRef = useRef<number | null>(null)
  const lastRerouteAtRef = useRef<number | null>(null)
  const lastRerouteOriginPosRef = useRef<LatLng | null>(null)
  const rerouteCountRef = useRef(0)
  const lastHeadingRef = useRef<number | null>(null)
  const prevFixRef = useRef<LatLng | null>(null)
  const routeSpeedRef = useRef(0) // metros/segundo del ultimo route load, para el ETA restante

  // El callback del watcher de GPS queda "congelado" (closure) desde que arranca el
  // efecto hasta que sus deps cambian. currentStepIndex/rerouting/job cambian mas
  // seguido que eso, asi que se leen desde estos refs (con doble escritura junto al
  // setState) en vez de las variables de estado directamente, para no leer valores viejos.
  const currentStepIndexRef = useRef(0)
  const reroutingRef = useRef(false)
  const jobRef = useRef<ActiveJob | null>(null)

  // Pantalla siempre encendida, pero solo mientras dura la navegacion activa.
  useEffect(() => {
    if (navMode !== 'navigating') return
    void activateKeepAwakeAsync('llevo-driver-nav')
    return () => {
      void deactivateKeepAwake('llevo-driver-nav')
    }
  }, [navMode])

  const SHEET_HEIGHT = insets.bottom + 260

  const cumulativePolyline = useMemo<CumulativePoint[]>(() => buildCumulativePolyline(routeCoords), [routeCoords])
  const stepBoundaries = useMemo(() => buildStepBoundaries(steps), [steps])

  const loadJobRef = useRef<() => Promise<void>>(async () => {})

  async function loadJob() {
    if (!token) return
    setLoading(true)
    try {
      const [data, locationResult] = await Promise.all([
        api.get<{ job: ActiveJob | null }>('/shipments/active-job', token),
        getInitialMapRegion().catch(() => null),
      ])
      const loc = locationResult?.source === 'device'
        ? { latitude: locationResult.region.latitude, longitude: locationResult.region.longitude }
        : null
      if (loc) setConductorLocation(loc)
      jobRef.current = data.job
      setJob(data.job)
      if (data.job) {
        void loadRoute(data.job, loc)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  // Mantiene la carga más reciente sin reabrir la pantalla en cada render.
  loadJobRef.current = loadJob

  useFocusEffect(
    useCallback(() => {
      void loadJobRef.current()
    }, [])
  )

  function resetNavProgress() {
    currentStepIndexRef.current = 0
    setCurrentStepIndex(0)
    setDistanceToNextManeuverMeters(0)
    offRouteSinceRef.current = null
  }

  function fitCameraToOverview(coords: LatLng[], markerCoords: LatLng[], conductorLoc: LatLng | null, includeConductor: boolean) {
    setTimeout(() => {
      const fitCoords: LatLng[] = [...markerCoords, ...coords]
      if (conductorLoc && includeConductor) fitCoords.push(conductorLoc)
      mapRef.current?.fitToCoordinates(fitCoords, {
        animated: true,
        edgePadding: {
          top: topInset + 80,
          right: 40,
          bottom: SHEET_HEIGHT + 32,
          left: 40,
        },
      })
    }, 400)
  }

  async function loadRoute(activeJob: ActiveJob, conductorLoc: LatLng | null) {
    setRouteError(null)
    try {
      const isPendingPickup = !activeJob.pickedUpAt

      // Always compute pickup→delivery to get both marker positions
      const markerRoutePromise = computeRoutePreview({
        origin: { label: activeJob.shipment.originAddress },
        destination: { label: activeJob.shipment.deliveryAddress },
      })

      // Phase 1 only: compute conductor→pickup for the navigation polyline
      const navRoutePromise = conductorLoc && isPendingPickup
        ? computeRoutePreview({
            origin: { latitude: conductorLoc.latitude, longitude: conductorLoc.longitude },
            destination: { label: activeJob.shipment.originAddress },
          })
        : null

      const [markerRoute, navRoute] = await Promise.all([markerRoutePromise, navRoutePromise])

      setOriginPoint(markerRoute.origin.location)
      setDeliveryPoint(markerRoute.destination.location)

      // Phase 1: conductor→pickup; Phase 2: pickup→delivery
      const displayRoute = navRoute ?? markerRoute
      const coords = decodePolyline(displayRoute.encodedPolyline)
      const finalCoords = coords.length >= 2 ? coords : [displayRoute.origin.location, displayRoute.destination.location]
      setRouteCoords(finalCoords)
      setSteps(displayRoute.steps)
      setDistanceRemainingMeters(displayRoute.distanceMeters)
      setEtaSeconds(displayRoute.durationSeconds)
      routeSpeedRef.current = displayRoute.durationSeconds > 0 ? displayRoute.distanceMeters / displayRoute.durationSeconds : 0
      resetNavProgress()

      fitCameraToOverview(
        finalCoords,
        [markerRoute.origin.location, markerRoute.destination.location],
        conductorLoc,
        isPendingPickup
      )
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : 'No se pudo cargar la ruta')
    }
  }

  // Recalcula solo el tramo actual (conductor -> destino de esta fase) cuando nos desviamos.
  // No vuelve a pedir la ruta pickup->delivery completa: los pines no cambian.
  async function rerouteFromPosition(position: LatLng) {
    const activeJob = jobRef.current
    if (!activeJob) return
    const isPendingPickup = !activeJob.pickedUpAt
    const destinationLabel = isPendingPickup ? activeJob.shipment.originAddress : activeJob.shipment.deliveryAddress

    reroutingRef.current = true
    setRerouting(true)
    try {
      const route = await computeRoutePreview({
        origin: { latitude: position.latitude, longitude: position.longitude },
        destination: { label: destinationLabel },
      })

      const coords = decodePolyline(route.encodedPolyline)
      const finalCoords = coords.length >= 2 ? coords : [route.origin.location, route.destination.location]
      setRouteCoords(finalCoords)
      setSteps(route.steps)
      setDistanceRemainingMeters(route.distanceMeters)
      setEtaSeconds(route.durationSeconds)
      routeSpeedRef.current = route.durationSeconds > 0 ? route.distanceMeters / route.durationSeconds : 0
      resetNavProgress()

      lastRerouteAtRef.current = Date.now()
      lastRerouteOriginPosRef.current = position
      rerouteCountRef.current += 1
    } catch {
      // Falla transitoria (ej. rate limit): seguimos navegando con la ruta vieja,
      // no tocamos routeError (eso es solo para la carga inicial).
    } finally {
      reroutingRef.current = false
      setRerouting(false)
    }
  }

  function handleNavigationFix(fix: DriverPositionFix) {
    const position: LatLng = { latitude: fix.latitude, longitude: fix.longitude }
    setConductorLocation(position)

    if (cumulativePolyline.length < 2) return

    const progress = computeNavProgress({
      position,
      cumulativePolyline,
      stepBoundaries,
      currentStepIndex: currentStepIndexRef.current,
    })

    currentStepIndexRef.current = progress.currentStepIndex
    setCurrentStepIndex(progress.currentStepIndex)
    setDistanceToNextManeuverMeters(progress.distanceToNextManeuverMeters)
    setDistanceRemainingMeters(progress.distanceRemainingMeters)
    if (routeSpeedRef.current > 0) {
      setEtaSeconds(progress.distanceRemainingMeters / routeSpeedRef.current)
    }

    const now = Date.now()
    offRouteSinceRef.current = updateOffRouteSince(progress.offRouteDistanceMeters, now, offRouteSinceRef.current)

    if (!reroutingRef.current) {
      const state: RerouteState = {
        offRouteSinceMs: offRouteSinceRef.current,
        lastRerouteAt: lastRerouteAtRef.current,
        lastRerouteOriginPos: lastRerouteOriginPosRef.current,
        rerouteCount: rerouteCountRef.current,
      }
      if (shouldTriggerReroute({ offRouteDistanceMeters: progress.offRouteDistanceMeters, now, currentPos: position, state })) {
        void rerouteFromPosition(position)
      }
    }

    const resolvedHeading = resolveHeading({
      gpsHeading: fix.heading,
      gpsSpeed: fix.speed,
      prevFix: prevFixRef.current,
      currFix: position,
      lastHeading: lastHeadingRef.current,
    })

    // Solo mandamos "heading" a la camara si cambio lo suficiente (evita jitter
    // visual de rotacion); center/pitch/zoom se actualizan siempre para seguir la posicion.
    const headingChanged = resolvedHeading !== null && (
      lastHeadingRef.current === null || headingDelta(resolvedHeading, lastHeadingRef.current) >= MIN_HEADING_DELTA_DEG
    )
    if (headingChanged) lastHeadingRef.current = resolvedHeading

    mapRef.current?.animateCamera(
      {
        center: position,
        pitch: NAV_CAMERA_PITCH,
        zoom: NAV_CAMERA_ZOOM,
        altitude: NAV_CAMERA_ALTITUDE,
        ...(headingChanged ? { heading: resolvedHeading! } : {}),
      },
      { duration: NAV_CAMERA_DURATION_MS }
    )

    prevFixRef.current = position
  }

  // Watcher de posicion de alta frecuencia: solo corre mientras navMode === 'navigating'.
  // Efecto separado del de arriba (que no tiene cleanup) porque este si necesita frenar
  // la suscripcion de GPS al salir de foco o al salir del modo navegacion.
  useFocusEffect(
    useCallback(() => {
      if (navMode !== 'navigating') return

      let subscription: Awaited<ReturnType<typeof watchDriverPosition>> | null = null
      let cancelled = false

      void watchDriverPosition(fix => {
        if (!cancelled) handleNavigationFix(fix)
      }).then(sub => {
        if (cancelled) sub?.remove()
        else subscription = sub
      })

      return () => {
        cancelled = true
        subscription?.remove()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navMode, job?.id, job?.pickedUpAt, cumulativePolyline, stepBoundaries])
  )

  function handleStartNavigation() {
    prevFixRef.current = null
    lastHeadingRef.current = null
    setNavMode('navigating')
  }

  function handleExitNavigation() {
    setNavMode('overview')
    if (job) {
      const isPendingPickup = !job.pickedUpAt
      fitCameraToOverview(
        routeCoords,
        originPoint && deliveryPoint ? [originPoint, deliveryPoint] : [],
        conductorLocation,
        isPendingPickup
      )
    }
  }

  async function handlePickup() {
    if (!token || !job) return
    setActionLoading(true)
    setActionError(null)
    try {
      await api.post('/shipments/active-job/pickup', {}, token)
      const updatedJob = { ...job, pickedUpAt: new Date().toISOString() }
      jobRef.current = updatedJob
      setJob(updatedJob)
      // Switch to phase 2: pickup→delivery route. Si ya estaba navegando, sigue navegando.
      void loadRoute(updatedJob, conductorLocation)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error. Intentá de nuevo.')
    } finally {
      setActionLoading(false)
    }
  }

  function handleCancelPress() {
    Alert.alert(
      'Cancelar trabajo',
      '¿Seguro que querés cancelar? Solo podés hacerlo antes de retirar el paquete. El pedido vuelve a estar disponible.',
      [
        { text: 'No, seguir', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => void handleCancel() },
      ]
    )
  }

  async function handleCancel() {
    if (!token) return
    setActionLoading(true)
    setActionError(null)
    try {
      await api.post('/shipments/active-job/cancel', {}, token)
      router.replace('/driver/home')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al cancelar. Intentá de nuevo.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeliver() {
    if (!token) return
    setActionLoading(true)
    setActionError(null)
    try {
      await api.post('/shipments/active-job/deliver', {}, token)
      router.replace('/driver/home')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error. Intentá de nuevo.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Theme.colors.lime} size="large" />
        <Text style={styles.loadingText}>Cargando ruta...</Text>
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cube-outline" size={40} color={Theme.colors.textMuted} />
        <Text style={styles.loadingText}>No tenés un trabajo activo.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/driver/home')}>
          <Text style={styles.backBtnText}>Volver al panel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isPendingPickup = !job.pickedUpAt
  const isPendingDelivery = !!job.pickedUpAt && !job.deliveredAt
  const isNavigating = navMode === 'navigating'
  const currentStep = steps[currentStepIndex] ?? null

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
        showsUserLocation
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {originPoint && (
          <Marker coordinate={originPoint} anchor={{ x: 0.5, y: 0.5 }}>
            <JobMarker type="pickup" />
          </Marker>
        )}

        {deliveryPoint && (
          <Marker coordinate={deliveryPoint} anchor={{ x: 0.5, y: 0.5 }}>
            <JobMarker type="delivery" />
          </Marker>
        )}

        {routeCoords.length >= 2 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Theme.colors.lime}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topInset + 12 }]}>
        {!isNavigating && (
          <TouchableOpacity style={styles.topBackBtn} onPress={() => router.replace('/driver/home')} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        )}

        {isNavigating ? (
          <>
            <ManeuverBanner rerouting={rerouting} step={currentStep} distanceToNextManeuverMeters={distanceToNextManeuverMeters} />
            <TouchableOpacity style={styles.topBackBtn} onPress={handleExitNavigation} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={Theme.colors.text} />
            </TouchableOpacity>
          </>
        ) : routeError ? (
          <View style={styles.topBadgeError}>
            <Ionicons name="alert-circle-outline" size={13} color={Theme.colors.danger} />
            <Text style={styles.topBadgeErrorText} numberOfLines={2}>{routeError}</Text>
          </View>
        ) : (
          <View style={styles.topBadge}>
            <Ionicons name={isPendingPickup ? 'cube-outline' : 'bicycle-outline'} size={13} color={Theme.colors.black} />
            <Text style={styles.topBadgeText}>
              {isPendingPickup ? 'Ir a buscar el paquete' : 'Llevar el paquete'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Bottom sheet ── */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />

        {isNavigating ? (
          <View style={styles.navSummaryRow}>
            <View style={styles.navSummaryCopy}>
              <Text style={styles.navSummaryValue}>{formatDistance(distanceRemainingMeters)}</Text>
              <Text style={styles.navSummaryLabel}>· {formatEtaMinutes(etaSeconds)} restantes</Text>
            </View>
          </View>
        ) : (
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, styles.routeDotOrigin]} />
              <View style={styles.routePointCopy}>
                <Text style={styles.routePointLabel}>RETIRO</Text>
                <Text style={styles.routePointAddress} numberOfLines={2}>{job.shipment.originAddress}</Text>
                <Text style={styles.routePointContact}>
                  {job.shipment.pickupContactName} · {job.shipment.pickupContactPhone}
                </Text>
              </View>
            </View>

            <View style={styles.routeDivider} />

            <View style={styles.routePoint}>
              <View style={[styles.routeDot, styles.routeDotDelivery]} />
              <View style={styles.routePointCopy}>
                <Text style={styles.routePointLabel}>ENTREGA</Text>
                <Text style={styles.routePointAddress} numberOfLines={2}>{job.shipment.deliveryAddress}</Text>
                <Text style={styles.routePointContact}>{job.shipment.recipientDetails}</Text>
              </View>
            </View>
          </View>
        )}

        {actionError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={15} color={Theme.colors.danger} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {!isNavigating && (isPendingPickup || isPendingDelivery) ? (
          <TouchableOpacity
            style={styles.navStartBtn}
            onPress={handleStartNavigation}
            disabled={routeCoords.length < 2}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color={Theme.colors.lime} />
            <Text style={styles.navStartBtnText}>Iniciar navegación</Text>
          </TouchableOpacity>
        ) : null}

        {isPendingPickup ? (
          <TouchableOpacity
            style={[styles.cancelBtn, actionLoading && styles.actionBtnDisabled]}
            onPress={handleCancelPress}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancelar trabajo</Text>
          </TouchableOpacity>
        ) : null}

        {isPendingPickup ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPickup, actionLoading && styles.actionBtnDisabled]}
            onPress={() => void handlePickup()}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading
              ? <ActivityIndicator size="small" color={Theme.colors.black} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={Theme.colors.black} />
                  <Text style={styles.actionBtnText}>Recogí el paquete</Text>
                </>
            }
          </TouchableOpacity>
        ) : isPendingDelivery ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDeliver, actionLoading && styles.actionBtnDisabled]}
            onPress={() => void handleDeliver()}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading
              ? <ActivityIndicator size="small" color={Theme.colors.text} />
              : <>
                  <Ionicons name="flag-outline" size={20} color={Theme.colors.text} />
                  <Text style={[styles.actionBtnText, styles.actionBtnTextDark]}>Entregué el paquete</Text>
                </>
            }
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
    backgroundColor: Theme.colors.background,
  },
  loadingText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 14 },
  backBtn: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  backBtnText: { color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 14 },

  // Map markers
  mapMarker: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 2, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
    elevation: 4,
  },
  mapMarkerDelivery: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  topBackBtn: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Theme.colors.lime,
  },
  topBadgeText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 13 },
  topBadgeError: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: Theme.colors.dangerSurface,
    borderWidth: 1, borderColor: Theme.colors.danger,
  },
  topBadgeErrorText: { flex: 1, color: Theme.colors.danger, fontFamily: Theme.fonts.semiBold, fontSize: 12 },

  // Maneuver banner (modo navegacion)
  maneuverBanner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
    backgroundColor: Theme.colors.lime,
  },
  maneuverIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  maneuverCopy: { flex: 1 },
  maneuverDistance: { color: Theme.colors.black, fontFamily: Theme.fonts.extraBold, fontSize: 15 },
  maneuverText: { color: Theme.colors.black, fontFamily: Theme.fonts.semiBold, fontSize: 12, marginTop: 1 },

  // Bottom sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10, gap: 14,
    borderTopWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Theme.colors.border,
    alignSelf: 'center', marginBottom: 4,
  },

  // Route
  routeRow: { gap: 0 },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  routeDot: {
    width: 10, height: 10, borderRadius: 5, marginTop: 3,
    flexShrink: 0,
  },
  routeDotOrigin: { backgroundColor: Theme.colors.text, borderWidth: 2, borderColor: Theme.colors.textMuted },
  routeDotDelivery: { backgroundColor: Theme.colors.lime },
  routeDivider: {
    height: 10, width: 1,
    backgroundColor: Theme.colors.border,
    marginLeft: 4, marginVertical: -2,
  },
  routePointCopy: { flex: 1 },
  routePointLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 1,
  },
  routePointAddress: { color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 13, lineHeight: 18 },
  routePointContact: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, marginTop: 2 },

  // Resumen de navegacion (reemplaza routeRow mientras se navega)
  navSummaryRow: {
    flexDirection: 'row', alignItems: 'baseline', paddingVertical: 4,
  },
  navSummaryCopy: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  navSummaryValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  navSummaryLabel: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 },

  navStartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.lime,
  },
  navStartBtnText: { color: Theme.colors.lime, fontFamily: Theme.fonts.bold, fontSize: 14 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, backgroundColor: Theme.colors.dangerSurface,
  },
  errorText: { flex: 1, color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 12 },

  cancelBtn: {
    alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14,
  },
  cancelBtnText: { color: Theme.colors.danger, fontFamily: Theme.fonts.medium, fontSize: 13 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16,
  },
  actionBtnPickup: { backgroundColor: Theme.colors.lime },
  actionBtnDeliver: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 15 },
  actionBtnTextDark: { color: Theme.colors.text },
}))
