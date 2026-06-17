import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Platform, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { darkMapStyle } from '../../constants/mapStyle'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { computeRoutePreview, decodePolyline } from '../../lib/maps'
import { DEFAULT_MAP_REGION } from '../../lib/location'

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

export default function DriverJobScreen() {
  const { token } = useAuth()
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0)
  const mapRef = useRef<MapView>(null)

  const [job, setJob] = useState<ActiveJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([])
  const [originPoint, setOriginPoint] = useState<LatLng | null>(null)
  const [deliveryPoint, setDeliveryPoint] = useState<LatLng | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const SHEET_HEIGHT = insets.bottom + 260

  useFocusEffect(
    useCallback(() => {
      void loadJob()
    }, [token])
  )

  async function loadJob() {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.get<{ job: ActiveJob | null }>('/shipments/active-job', token)
      setJob(data.job)
      if (data.job) {
        void loadRoute(data.job)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  async function loadRoute(activeJob: ActiveJob) {
    try {
      const route = await computeRoutePreview({
        origin: { label: activeJob.shipment.originAddress },
        destination: { label: activeJob.shipment.deliveryAddress },
      })
      const coords = decodePolyline(route.encodedPolyline)
      setRouteCoords(coords.length >= 2 ? coords : [route.origin.location, route.destination.location])
      setOriginPoint(route.origin.location)
      setDeliveryPoint(route.destination.location)
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [route.origin.location, route.destination.location, ...coords],
          {
            animated: true,
            edgePadding: {
              top: topInset + 80,
              right: 40,
              bottom: SHEET_HEIGHT + 32,
              left: 40,
            },
          }
        )
      }, 400)
    } catch {
      // silently ignore — map just won't show the route
    }
  }

  async function handlePickup() {
    if (!token) return
    setActionLoading(true)
    setActionError(null)
    try {
      await api.post('/shipments/active-job/pickup', {}, token)
      setJob(prev => prev ? { ...prev, pickedUpAt: new Date().toISOString() } : null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error. Intentá de nuevo.')
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
        <TouchableOpacity style={styles.topBackBtn} onPress={() => router.replace('/driver/home')} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.topBadge}>
          <Ionicons name={isPendingPickup ? 'cube-outline' : 'bicycle-outline'} size={13} color={Theme.colors.black} />
          <Text style={styles.topBadgeText}>
            {isPendingPickup ? 'Ir a buscar el paquete' : 'Llevar el paquete'}
          </Text>
        </View>
      </View>

      {/* ── Bottom sheet ── */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />

        {/* Route row */}
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

        {actionError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={15} color={Theme.colors.danger} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
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

const styles = StyleSheet.create({
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

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, backgroundColor: Theme.colors.dangerSurface,
  },
  errorText: { flex: 1, color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 12 },

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
})
