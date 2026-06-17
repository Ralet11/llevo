import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Shipment = {
  id: string
  originCity: string
  destinationCity: string
  weightKg: number
  packageSize: string
  pickupContactName: string
  pickupContactPhone: string
  recipientDetails: string
  notes: string | null
  preferredDate: string | null
  lastNotifiedAt: string | null
}

type UpcomingShipment = {
  id: string
  originCity: string
  destinationCity: string
  weightKg: number
  packageSize: string
  pickupContactName: string
  pickupContactPhone: string
  recipientDetails: string
  notes: string | null
  preferredDate: string
}

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
    preferredDate: string | null
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

type DriverRoute = {
  id: string
  originCity: string
  waypointCities: string[]
  destinationCity: string
  daysOfWeek: string[]
  vehicleType: string
  licensePlate: string | null
  vehicleModel: string | null
  vehicleColor: string | null
  maxWeightKg: number
  pricePerKg: number | null
  isActive: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PACKAGE_SIZE_LABELS: Record<string, string> = {
  SMALL: 'Pequeño', MEDIUM: 'Mediano', LARGE: 'Grande', BULKY: 'Voluminoso',
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié',
  THURSDAY: 'Jue', FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
}

const VEHICLE_LABELS: Record<string, string> = {
  MOTO: 'Moto', AUTO: 'Auto', CAMIONETA: 'Camioneta', CAMION: 'Camión',
}

const POLL_INTERVAL = 30_000

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DriverHomeScreen() {
  const { driverProfile, token } = useAuth()
  const [pendingShipment, setPendingShipment] = useState<Shipment | null>(null)
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null)
  const [upcomingShipments, setUpcomingShipments] = useState<UpcomingShipment[]>([])
  const [routes, setRoutes] = useState<DriverRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [upcomingResponding, setUpcomingResponding] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      if (action === 'accept') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/driver/job' as any)
      }
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
      if (action === 'accept') {
        router.replace('/driver/job' as any)
      }
    } catch {} finally {
      setUpcomingResponding(null)
    }
  }

  async function handleToggleRoute(route: DriverRoute) {
    if (!token) return
    setTogglingId(route.id)
    try {
      await api.patch(`/drivers/routes/${route.id}`, { isActive: !route.isActive }, token)
      setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, isActive: !r.isActive } : r))
    } catch {} finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteRoute(routeId: string) {
    if (!token) return
    setDeletingId(routeId)
    try {
      await api.delete(`/drivers/routes/${routeId}`, token)
      setRoutes(prev => prev.filter(r => r.id !== routeId))
    } catch {} finally {
      setDeletingId(null)
    }
  }

  if (!driverProfile?.onboardingCompleted) return null

  const sectionTitle = activeJob ? 'Trabajo activo' : 'Pedido entrante'

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/(app)')} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Mi panel</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(app)')} style={styles.resetBtn}>
          <Ionicons name="swap-horizontal" size={18} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Pedido / Trabajo activo ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Theme.colors.lime} />
            </View>
          ) : activeJob ? (
            <ActiveJobCard
              job={activeJob}
              onViewMap={() => router.replace('/driver/job' as any)}
            />
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

        {/* ── Próximos envíos ── */}
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

        {/* ── Mis rutas ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis rutas</Text>
            <TouchableOpacity
              style={styles.addRouteBtn}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/driver/setup', params: { mode: 'entrega', addingRoute: '1' } })}
            >
              <Ionicons name="add" size={16} color={Theme.colors.black} />
              <Text style={styles.addRouteBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {routes.length === 0 && !loading ? (
            <View style={styles.emptyRoutes}>
              <Text style={styles.emptyRoutesText}>No tenés rutas registradas aún.</Text>
            </View>
          ) : (
            routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                toggling={togglingId === route.id}
                deleting={deletingId === route.id}
                onToggle={() => void handleToggleRoute(route)}
                onDelete={() => void handleDeleteRoute(route.id)}
              />
            ))
          )}
        </View>

      </ScrollView>
    </ScreenSafeArea>
  )
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function ActiveJobCard({ job, onViewMap }: {
  job: ActiveJob
  onViewMap: () => void
}) {
  const isPendingPickup = !job.pickedUpAt
  const isFuture = job.shipment.preferredDate && new Date(job.shipment.preferredDate) > new Date()

  return (
    <View style={styles.activeJobCard}>
      {isFuture ? (
        <View style={styles.upcomingScheduledBadge}>
          <Ionicons name="calendar-outline" size={14} color={Theme.colors.text} />
          <Text style={styles.upcomingScheduledBadgeText}>
            Programado para el {new Date(job.shipment.preferredDate!).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      ) : (
        <View style={styles.activeJobBadge}>
          <Ionicons name={isPendingPickup ? 'cube-outline' : 'bicycle-outline'} size={14} color={Theme.colors.black} />
          <Text style={styles.offerBadgeText}>
            {isPendingPickup ? 'Pendiente de retiro' : 'En camino a entregar'}
          </Text>
        </View>
      )}

      <Text style={styles.offerRoute}>
        {job.shipment.originCity} → {job.shipment.destinationCity}
      </Text>

      <View style={styles.jobAddressRow}>
        <Ionicons name="locate" size={13} color={Theme.colors.textMuted} />
        <Text style={styles.jobAddressText} numberOfLines={1}>{job.shipment.originAddress}</Text>
      </View>
      <View style={styles.jobAddressRow}>
        <Ionicons name="flag" size={13} color={Theme.colors.lime} />
        <Text style={styles.jobAddressText} numberOfLines={1}>{job.shipment.deliveryAddress}</Text>
      </View>

      <TouchableOpacity style={styles.viewMapBtn} onPress={onViewMap} activeOpacity={0.85}>
        <Ionicons name="map-outline" size={18} color={Theme.colors.black} />
        <Text style={styles.viewMapBtnText}>Ver ruta en el mapa</Text>
      </TouchableOpacity>
    </View>
  )
}

function UpcomingShipmentCard({ shipment, responding, onAccept, onReject }: {
  shipment: UpcomingShipment
  responding: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const dateLabel = new Date(shipment.preferredDate).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingDateBadge}>
        <Ionicons name="calendar" size={13} color={Theme.colors.black} />
        <Text style={styles.upcomingDateText}>{dateLabel}</Text>
      </View>

      <Text style={styles.offerRoute}>
        {shipment.originCity} → {shipment.destinationCity}
      </Text>

      <View style={styles.offerDetails}>
        <DetailRow icon="scale-outline" label="Peso" value={`${shipment.weightKg} kg`} />
        <DetailRow icon="cube-outline" label="Tamaño" value={PACKAGE_SIZE_LABELS[shipment.packageSize] ?? shipment.packageSize} />
        <DetailRow icon="call-outline" label="Contacto en origen" value={`${shipment.pickupContactName} · ${shipment.pickupContactPhone}`} />
        <DetailRow icon="person-outline" label="Receptor" value={shipment.recipientDetails} />
        {shipment.notes ? <DetailRow icon="document-text-outline" label="Notas" value={shipment.notes} /> : null}
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.rejectBtn, responding && styles.btnDisabled]}
          onPress={onReject}
          disabled={responding}
        >
          <Ionicons name="close" size={18} color={Theme.colors.textMuted} />
          <Text style={styles.rejectBtnText}>Pasar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.acceptBtn, responding && styles.btnDisabled]}
          onPress={onAccept}
          disabled={responding}
        >
          {responding
            ? <ActivityIndicator size="small" color={Theme.colors.black} />
            : <>
                <Ionicons name="checkmark" size={18} color={Theme.colors.black} />
                <Text style={styles.acceptBtnText}>Pre-aceptar</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

function RouteCard({ route, toggling, deleting, onToggle, onDelete }: {
  route: DriverRoute
  toggling: boolean
  deleting: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const allCities = [route.originCity, ...route.waypointCities, route.destinationCity]
  const daysText = route.daysOfWeek.map(d => DAY_LABELS[d] ?? d).join(' · ')
  const vehicleText = VEHICLE_LABELS[route.vehicleType] ?? route.vehicleType

  return (
    <View style={[styles.routeCard, !route.isActive && styles.routeCardInactive]}>
      <View style={styles.routeCardTop}>
        <View style={styles.routeCities}>
          <Text style={styles.routeCitiesText} numberOfLines={1}>
            {allCities.join(' → ')}
          </Text>
          {(route.licensePlate || route.vehicleModel) ? (
            <Text style={styles.routeVehicleText} numberOfLines={1}>
              {[route.vehicleModel, route.licensePlate].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onToggle}
          disabled={toggling || deleting}
          style={[styles.routeToggle, route.isActive && styles.routeToggleActive]}
          activeOpacity={0.8}
        >
          {toggling
            ? <ActivityIndicator size="small" color={route.isActive ? Theme.colors.black : Theme.colors.textMuted} />
            : <Text style={[styles.routeToggleText, route.isActive && styles.routeToggleTextActive]}>
                {route.isActive ? 'Activa' : 'Pausada'}
              </Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          disabled={toggling || deleting}
          style={styles.deleteRouteBtn}
          activeOpacity={0.7}
        >
          {deleting
            ? <ActivityIndicator size="small" color={Theme.colors.danger} />
            : <Ionicons name="trash-outline" size={17} color={Theme.colors.danger} />
          }
        </TouchableOpacity>
      </View>

      <View style={styles.routeMeta}>
        <View style={styles.routeMetaChip}>
          <Ionicons name="calendar-outline" size={12} color={Theme.colors.textMuted} />
          <Text style={styles.routeMetaText}>{daysText}</Text>
        </View>
        <View style={styles.routeMetaChip}>
          <Ionicons name="car-outline" size={12} color={Theme.colors.textMuted} />
          <Text style={styles.routeMetaText}>{vehicleText}</Text>
        </View>
        <View style={styles.routeMetaChip}>
          <Ionicons name="scale-outline" size={12} color={Theme.colors.textMuted} />
          <Text style={styles.routeMetaText}>hasta {route.maxWeightKg}kg</Text>
        </View>
        {route.pricePerKg ? (
          <View style={styles.routeMetaChip}>
            <Ionicons name="pricetag-outline" size={12} color={Theme.colors.textMuted} />
            <Text style={styles.routeMetaText}>${route.pricePerKg}/kg</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function ShipmentOfferCard({ shipment, responding, error, onAccept, onReject }: {
  shipment: Shipment
  responding: boolean
  error: string | null
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerBadge}>
        <Ionicons name="cube" size={14} color={Theme.colors.black} />
        <Text style={styles.offerBadgeText}>Nuevo pedido en tu ruta</Text>
      </View>

      <Text style={styles.offerRoute}>
        {shipment.originCity} → {shipment.destinationCity}
      </Text>

      <View style={styles.offerDetails}>
        <DetailRow icon="scale-outline" label="Peso" value={`${shipment.weightKg} kg`} />
        <DetailRow icon="cube-outline" label="Tamaño" value={PACKAGE_SIZE_LABELS[shipment.packageSize] ?? shipment.packageSize} />
        <DetailRow icon="call-outline" label="Contacto en origen" value={`${shipment.pickupContactName} · ${shipment.pickupContactPhone}`} />
        <DetailRow icon="person-outline" label="Receptor" value={shipment.recipientDetails} />
        {shipment.preferredDate ? (
          <DetailRow icon="calendar-outline" label="Fecha preferida" value={new Date(shipment.preferredDate).toLocaleDateString('es-AR')} />
        ) : null}
        {shipment.notes ? (
          <DetailRow icon="document-text-outline" label="Notas" value={shipment.notes} />
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={15} color={Theme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.offerActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.rejectBtn, responding && styles.btnDisabled]}
          onPress={onReject}
          disabled={responding}
        >
          <Ionicons name="close" size={18} color={Theme.colors.textMuted} />
          <Text style={styles.rejectBtnText}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.acceptBtn, responding && styles.btnDisabled]}
          onPress={onAccept}
          disabled={responding}
        >
          {responding
            ? <ActivityIndicator size="small" color={Theme.colors.black} />
            : <>
                <Ionicons name="checkmark" size={18} color={Theme.colors.black} />
                <Text style={styles.acceptBtnText}>Aceptar</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={Theme.colors.lime} style={styles.detailIcon} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

function EmptyShipmentState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="cube-outline" size={28} color={Theme.colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin pedidos pendientes</Text>
      <Text style={styles.emptyText}>
        Cuando un paquete coincida con alguna de tus rutas te avisamos acá.
      </Text>
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4,
  },
  headerCopy: { flex: 1 },
  headerLabel: {
    color: Theme.colors.lime, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  headerTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16, marginTop: 2 },
  resetBtn: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 24 },
  centerState: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  addRouteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: Theme.colors.lime,
  },
  addRouteBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 12 },

  // Active job card
  activeJobCard: {
    padding: 20, borderRadius: 24, gap: 12,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1.5, borderColor: Theme.colors.lime,
  },
  activeJobBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.lime,
  },
  jobAddressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  jobAddressText: {
    flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13,
  },
  viewMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, backgroundColor: Theme.colors.lime, marginTop: 4,
  },
  viewMapBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },

  // Route card
  routeCard: {
    padding: 16, borderRadius: 20, gap: 10,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  routeCardInactive: { opacity: 0.55 },
  routeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeCities: { flex: 1 },
  routeCitiesText: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  routeVehicleText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, marginTop: 2 },
  routeToggle: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.border,
    minWidth: 70, alignItems: 'center',
  },
  routeToggleActive: { backgroundColor: Theme.colors.lime, borderColor: Theme.colors.lime },
  routeToggleText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 11 },
  routeToggleTextActive: { color: Theme.colors.black },
  deleteRouteBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.dangerSurface,
  },
  routeMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  routeMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  routeMetaText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11 },

  emptyRoutes: {
    padding: 16, borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  emptyRoutesText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 },

  // Offer card
  offerCard: {
    padding: 20, borderRadius: 24, gap: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  offerBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.lime,
  },
  offerBadgeText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 12 },
  offerRoute: { color: Theme.colors.text, fontFamily: Theme.fonts.display, fontSize: 24, lineHeight: 28 },
  offerDetails: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailIcon: { marginTop: 2 },
  detailCopy: { flex: 1 },
  detailLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  detailValue: { color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 14, lineHeight: 20, marginTop: 2 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, backgroundColor: Theme.colors.dangerSurface,
  },
  errorText: { flex: 1, color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 12 },
  offerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 50, borderRadius: 16,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  rejectBtnText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 14 },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 50, borderRadius: 16, backgroundColor: Theme.colors.lime,
  },
  acceptBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  // Upcoming card
  upcomingCard: {
    padding: 20, borderRadius: 24, gap: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.borderSoft,
  },
  upcomingDateBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  upcomingDateText: {
    color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 12,
    textTransform: 'capitalize',
  },
  upcomingScheduledBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  upcomingScheduledBadgeText: {
    color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 12,
    textTransform: 'capitalize',
  },

  // Empty state
  emptyState: {
    alignItems: 'center', padding: 24, borderRadius: 20, gap: 10,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
  },
  emptyTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  emptyText: {
    color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium,
    fontSize: 13, lineHeight: 20, textAlign: 'center',
  },
})
