import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MapView, { type Region } from 'react-native-maps'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { IconButton } from '../../../components/ui/IconButton'
import { darkMapStyle } from '../../../constants/mapStyle'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { DEFAULT_MAP_REGION, getInitialMapRegion } from '../../../lib/location'
import {
  ActiveJobCard,
  EmptyShipmentState,
  ShipmentOfferCard,
  UpcomingShipmentCard,
  styles,
  type ActiveJob,
  type DriverRoute,
  type Shipment,
  type UpcomingShipment,
} from '../_panel'

const POLL_INTERVAL = 30_000

export default function DriverInicioScreen() {
  const { driverProfile, token, user } = useAuth()
  const [pendingShipment, setPendingShipment] = useState<Shipment | null>(null)
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null)
  const [upcomingShipments, setUpcomingShipments] = useState<UpcomingShipment[]>([])
  const [routes, setRoutes] = useState<DriverRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [upcomingResponding, setUpcomingResponding] = useState<string | null>(null)
  const [localBusy, setLocalBusy] = useState(false)
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_MAP_REGION)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Centra el mapa en la posicion del conductor (cae al default si no hay permiso).
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { region } = await getInitialMapRegion()
        if (active) setMapRegion(region)
      } catch {}
    })()
    return () => { active = false }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!driverProfile?.onboardingCompleted) { router.replace('/driver'); return }
      void fetchData()
      intervalRef.current = setInterval(() => { void fetchPendingAndJob() }, POLL_INTERVAL)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [token, driverProfile])
  )

  async function fetchData() {
    if (!token) return
    setLoading(true)
    await Promise.all([fetchPendingAndJob(), fetchRoutes()])
    setLoading(false)
  }

  async function fetchPendingAndJob() {
    if (!token) return
    try {
      const [pendingData, jobData, upcomingData] = await Promise.all([
        api.get<{ shipment: Shipment | null }>('/shipments/pending-for-driver', token),
        api.get<{ job: ActiveJob | null }>('/shipments/active-job', token),
        api.get<{ shipments: UpcomingShipment[] }>('/shipments/upcoming-for-driver', token),
      ])
      setPendingShipment(pendingData.shipment)
      setActiveJob(jobData.job)
      setUpcomingShipments(upcomingData.shipments)
    } catch {}
  }

  async function fetchRoutes() {
    if (!token) return
    try {
      const data = await api.get<{ routes: DriverRoute[] }>('/drivers/routes/mine', token)
      setRoutes(data.routes)
    } catch {}
  }

  async function handleRespond(action: 'accept' | 'reject') {
    if (!pendingShipment || !token) return
    setResponding(true)
    setResponseError(null)
    try {
      await api.post(`/shipments/${pendingShipment.id}/respond`, { action }, token)
      setPendingShipment(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (action === 'accept') router.replace('/driver/job' as any)
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : 'Error al responder. Intentá de nuevo.')
    } finally {
      setResponding(false)
    }
  }

  async function handleRespondUpcoming(shipmentId: string, action: 'accept' | 'reject') {
    if (!token) return
    setUpcomingResponding(shipmentId)
    try {
      await api.post(`/shipments/${shipmentId}/respond`, { action }, token)
      setUpcomingShipments(prev => prev.filter(s => s.id !== shipmentId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (action === 'accept') router.replace('/driver/job' as any)
    } catch {} finally {
      setUpcomingResponding(null)
    }
  }

  // Pone online/offline todas las rutas locales de una (presencia en tiempo real).
  async function handleSetLocalOnline(online: boolean) {
    if (!token) return
    const local = routes.filter(r => r.kind === 'LOCAL')
    if (local.length === 0) return
    setLocalBusy(true)
    try {
      await Promise.all(
        local.filter(r => r.isActive !== online).map(r => api.patch(`/drivers/routes/${r.id}`, { isActive: online }, token))
      )
      setRoutes(prev => prev.map(r => r.kind === 'LOCAL' ? { ...r, isActive: online } : r))
    } catch {} finally {
      setLocalBusy(false)
    }
  }

  if (!driverProfile?.onboardingCompleted) return null

  const sectionTitle = activeJob ? 'Trabajo activo' : 'Pedido entrante'
  const localRoutes = routes.filter(r => r.kind === 'LOCAL')
  const isLocalOnline = localRoutes.some(r => r.isActive)
  const onlineCities = Array.from(new Set(localRoutes.filter(r => r.isActive).map(r => r.originCity)))
  const activeIntercityCount = routes.filter(r => r.kind === 'INTERCITY' && r.isActive).length
  const firstName = user?.name?.trim().split(' ')[0] || 'conductor'
  const ratingLabel = user && user.ratingCount > 0 ? user.rating.toFixed(1) : 'Nuevo'

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/(app)')} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Hola, {firstName} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(app)')} style={styles.resetBtn}>
          <Ionicons name="swap-horizontal" size={18} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero de estado con mapa (drivers locales) */}
        {localRoutes.length > 0 ? (
          <View style={[mapStyles.mapCard, isLocalOnline ? mapStyles.mapCardOnline : mapStyles.mapCardOffline]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <MapView
                style={StyleSheet.absoluteFill}
                customMapStyle={darkMapStyle}
                region={mapRegion}
                showsUserLocation
                showsMyLocationButton={false}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled={false}
                zoomEnabled={false}
                toolbarEnabled={false}
              />
              {!isLocalOnline ? <View style={mapStyles.mapDim} /> : null}
            </View>

            <View style={mapStyles.mapOverlay}>
              <View style={styles.heroTop}>
                <View style={[styles.heroDot, isLocalOnline ? styles.heroDotOn : styles.heroDotOff]} />
                <Text style={styles.heroState}>{isLocalOnline ? 'Estás online' : 'Estás offline'}</Text>
              </View>
              <Text style={styles.heroSub}>
                {isLocalOnline
                  ? `Recibiendo envíos en ${onlineCities.join(', ') || 'tu ciudad'}`
                  : 'No estás recibiendo envíos locales ahora'}
              </Text>
              <TouchableOpacity
                style={[styles.heroBtn, isLocalOnline ? styles.heroBtnOff : styles.heroBtnOn]}
                activeOpacity={0.85}
                disabled={localBusy}
                onPress={() => void handleSetLocalOnline(!isLocalOnline)}
              >
                {localBusy
                  ? <ActivityIndicator size="small" color={isLocalOnline ? Theme.colors.text : Theme.colors.black} />
                  : <Text style={[styles.heroBtnText, !isLocalOnline && styles.heroBtnTextOn]}>
                      {isLocalOnline ? 'Pausar' : 'Ponerme online'}
                    </Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : activeIntercityCount > 0 ? (
          <View style={[styles.hero, styles.heroOnline]}>
            <View style={styles.heroTop}>
              <View style={[styles.heroDot, styles.heroDotOn]} />
              <Text style={styles.heroState}>Rutas activas</Text>
            </View>
            <Text style={styles.heroSub}>
              Te avisamos cuando un paquete coincida con {activeIntercityCount === 1 ? 'tu ruta' : 'tus rutas'}.
            </Text>
          </View>
        ) : null}

        {/* Strip de identidad */}
        <View style={styles.identityStrip}>
          <View style={styles.identityItem}>
            <Ionicons name="star" size={14} color={Theme.colors.lime} />
            <Text style={styles.identityValue}>{ratingLabel}</Text>
            <Text style={styles.identityLabel}>rating</Text>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.identityItem}>
            <Ionicons name="cube" size={14} color={Theme.colors.textMuted} />
            <Text style={styles.identityValue}>{user?.ratingCount ?? 0}</Text>
            <Text style={styles.identityLabel}>entregas</Text>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.identityItem}>
            <Ionicons name="git-branch" size={14} color={Theme.colors.textMuted} />
            <Text style={styles.identityValue}>{routes.length}</Text>
            <Text style={styles.identityLabel}>rutas</Text>
          </View>
        </View>

        {/* Pedido / Trabajo activo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Theme.colors.lime} />
            </View>
          ) : activeJob ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <ActiveJobCard job={activeJob} onViewMap={() => router.replace('/driver/job' as any)} />
          ) : pendingShipment ? (
            <ShipmentOfferCard
              shipment={pendingShipment}
              responding={responding}
              error={responseError}
              onAccept={() => void handleRespond('accept')}
              onReject={() => void handleRespond('reject')}
            />
          ) : (
            <EmptyShipmentState />
          )}
        </View>

        {/* Próximos envíos */}
        {upcomingShipments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximos envíos</Text>
            {upcomingShipments.map(s => (
              <UpcomingShipmentCard
                key={s.id}
                shipment={s}
                responding={upcomingResponding === s.id}
                onAccept={() => void handleRespondUpcoming(s.id, 'accept')}
                onReject={() => void handleRespondUpcoming(s.id, 'reject')}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenSafeArea>
  )
}

const mapStyles = StyleSheet.create({
  mapCard: {
    height: 240,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: Theme.colors.surface,
  },
  mapCardOnline: { borderColor: Theme.colors.lime },
  mapCardOffline: { borderColor: Theme.colors.border },
  mapDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.45)' },
  mapOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 16, gap: 8,
    backgroundColor: 'rgba(10,10,10,0.78)',
  },
})
