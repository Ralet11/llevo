import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Theme } from '../../constants/theme'

// ─── Tipos compartidos ──────────────────────────────────────────────────────

export type Shipment = {
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

export type UpcomingShipment = {
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

export type ActiveJob = {
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

export type DriverRoute = {
  id: string
  kind: 'INTERCITY' | 'LOCAL'
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

export const PACKAGE_SIZE_LABELS: Record<string, string> = {
  SMALL: 'Pequeño', MEDIUM: 'Mediano', LARGE: 'Grande', BULKY: 'Voluminoso',
}

export const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié',
  THURSDAY: 'Jue', FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
}

export const VEHICLE_LABELS: Record<string, string> = {
  MOTO: 'Moto', AUTO: 'Auto', CAMIONETA: 'Camioneta', CAMION: 'Camión',
}

// ─── Componentes ─────────────────────────────────────────────────────────────

export function ActiveJobCard({ job, onViewMap }: { job: ActiveJob; onViewMap: () => void }) {
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

export function UpcomingShipmentCard({ shipment, responding, onAccept, onReject }: {
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

export function ShipmentOfferCard({ shipment, responding, error, onAccept, onReject }: {
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
        <Text style={styles.offerBadgeText}>Nuevo pedido para vos</Text>
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

export function RouteCard({ route, toggling, deleting, onToggle, onDelete }: {
  route: DriverRoute
  toggling: boolean
  deleting: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const isLocal = route.kind === 'LOCAL'
  const allCities = [route.originCity, ...route.waypointCities, route.destinationCity]
  const titleText = isLocal ? `Repartos en ${route.originCity}` : allCities.join(' → ')
  const daysText = route.daysOfWeek.map(d => DAY_LABELS[d] ?? d).join(' · ')
  const vehicleText = VEHICLE_LABELS[route.vehicleType] ?? route.vehicleType
  const activeLabel = isLocal ? 'Online' : 'Activa'
  const inactiveLabel = isLocal ? 'Offline' : 'Pausada'

  return (
    <View style={[styles.routeCard, !route.isActive && styles.routeCardInactive]}>
      <View style={styles.routeCardTop}>
        <View style={styles.routeCities}>
          <View style={styles.routeKindRow}>
            <Ionicons
              name={isLocal ? 'business' : 'navigate'}
              size={13}
              color={isLocal ? Theme.colors.lime : Theme.colors.textMuted}
            />
            <Text style={styles.routeCitiesText} numberOfLines={1}>{titleText}</Text>
          </View>
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
                {route.isActive ? activeLabel : inactiveLabel}
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
        {isLocal ? (
          <View style={styles.routeMetaChip}>
            <Ionicons name="flash-outline" size={12} color={Theme.colors.textMuted} />
            <Text style={styles.routeMetaText}>Envíos locales</Text>
          </View>
        ) : (
          <View style={styles.routeMetaChip}>
            <Ionicons name="calendar-outline" size={12} color={Theme.colors.textMuted} />
            <Text style={styles.routeMetaText}>{daysText}</Text>
          </View>
        )}
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

export function EmptyShipmentState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="checkmark-done" size={26} color={Theme.colors.lime} />
      </View>
      <Text style={styles.emptyTitle}>Todo listo</Text>
      <Text style={styles.emptyText}>
        Te avisamos con una notificación apenas entre un pedido que coincida con vos.
      </Text>
      <View style={styles.emptyTip}>
        <Ionicons name="bulb-outline" size={14} color={Theme.colors.lime} />
        <Text style={styles.emptyTipText}>
          Tip: más días activos y estar online suman más pedidos.
        </Text>
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

// ─── Estilos compartidos ─────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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

  hero: { padding: 20, borderRadius: 22, gap: 10, borderWidth: 1.5 },
  heroOnline: { backgroundColor: 'rgba(190,242,100,0.08)', borderColor: Theme.colors.lime },
  heroOffline: { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.border },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { width: 10, height: 10, borderRadius: 5 },
  heroDotOn: { backgroundColor: Theme.colors.lime },
  heroDotOff: { backgroundColor: Theme.colors.textMuted },
  heroState: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 18 },
  heroSub: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 19 },
  heroBtn: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 18, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnOn: { backgroundColor: Theme.colors.lime },
  heroBtnOff: { backgroundColor: Theme.colors.surfaceElevated, borderWidth: 1, borderColor: Theme.colors.border },
  heroBtnText: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  heroBtnTextOn: { color: Theme.colors.black },

  identityStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  identityItem: { flex: 1, alignItems: 'center', gap: 3 },
  identityValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  identityLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.medium,
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  identityDivider: { width: 1, height: 28, backgroundColor: Theme.colors.border },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  addRouteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: Theme.colors.lime,
  },
  addRouteBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 12 },

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
  jobAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobAddressText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 },
  viewMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, backgroundColor: Theme.colors.lime, marginTop: 4,
  },
  viewMapBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },

  routeCard: {
    padding: 16, borderRadius: 20, gap: 10,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  routeCardInactive: { opacity: 0.55 },
  routeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeCities: { flex: 1 },
  routeKindRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeCitiesText: { flex: 1, color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
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

  nudgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderStyle: 'dashed', borderColor: Theme.colors.lime,
  },
  nudgeIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  nudgeBody: { flex: 1, gap: 2 },
  nudgeTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  nudgeDesc: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 16 },

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
  emptyTip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  emptyTipText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, lineHeight: 16 },
})
