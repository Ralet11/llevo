import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Theme } from '../../constants/theme'
import { OfferCountdownBadge } from '../../components/app/OfferCountdownBadge'
import { themedStyles } from '../../lib/theme'

export type ShipmentSender = { id: string; name: string; rating: number; ratingCount: number }

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
  sender?: ShipmentSender | null
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
  sender?: ShipmentSender | null
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
  carriesPassengers?: boolean
  seatsOffered?: number | null
  pricePerSeat?: number | null
  vehicleId?: string | null
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

// Item de agenda: una oferta pendiente o un trabajo ya aceptado, con su fecha.
// isLocal: true si lo cubre una ruta LOCAL (demanda de hoy en tu ciudad) en vez de
// un viaje INTERCITY programado — misma distincion que separa las rutas en "Mis rutas".
export type AgendaItem =
  | { kind: 'OFFER'; date: string; isLocal: boolean; shipment: Shipment }
  | { kind: 'JOB'; date: string; isLocal: boolean; job: ActiveJob }

// ─── Helpers de fecha ────────────────────────────────────────────────────────

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Clave local YYYY-MM-DD para agrupar/contar por día.
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function groupByDay(items: AgendaItem[]): Record<string, AgendaItem[]> {
  const out: Record<string, AgendaItem[]> = {}
  for (const item of items) {
    const key = dayKey(new Date(item.date))
    ;(out[key] ??= []).push(item)
  }
  return out
}

// ─── Componentes ─────────────────────────────────────────────────────────────

// Chip tocable con la reputación del remitente: deja al conductor ver el perfil
// público antes de aceptar. Solo se muestra si el pedido trae datos del sender.
export function SenderChip({ sender }: { sender: ShipmentSender }) {
  const firstName = sender.name.trim().split(' ')[0]
  return (
    <TouchableOpacity
      style={styles.senderChip}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: sender.id } })}
    >
      <Ionicons name="person-circle-outline" size={16} color={Theme.colors.lime} />
      <Text style={styles.senderChipText} numberOfLines={1}>Enviado por {firstName}</Text>
      {sender.ratingCount > 0 ? (
        <View style={styles.senderChipRating}>
          <Ionicons name="star" size={11} color={Theme.colors.lime} />
          <Text style={styles.senderChipRatingText}>{sender.rating.toFixed(1)}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={Theme.colors.textMuted} />
    </TouchableOpacity>
  )
}

export function ActiveJobCard({ job, onViewMap, onPress }: { job: ActiveJob; onViewMap: () => void; onPress?: () => void }) {
  const isDelivered = !!job.deliveredAt
  const isPendingPickup = !job.pickedUpAt
  const isFuture = job.shipment.preferredDate && new Date(job.shipment.preferredDate) > new Date()

  const CardWrapper = onPress ? TouchableOpacity : View
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.85 } : {}

  return (
    <CardWrapper style={[styles.activeJobCard, isDelivered && styles.activeJobCardDone]} {...wrapperProps}>
      {isDelivered ? (
        <View style={styles.deliveredBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Theme.colors.lime} />
          <Text style={styles.deliveredBadgeText}>Entregado</Text>
        </View>
      ) : isFuture ? (
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

      {!isDelivered ? (
        <TouchableOpacity style={styles.viewMapBtn} onPress={onViewMap} activeOpacity={0.85}>
          <Ionicons name="map-outline" size={18} color={Theme.colors.black} />
          <Text style={styles.viewMapBtnText}>Ver ruta en el mapa</Text>
        </TouchableOpacity>
      ) : null}

      {onPress ? (
        <View style={styles.jobDetailHint}>
          <Text style={styles.jobDetailHintText}>Ver detalle</Text>
          <Ionicons name="chevron-forward" size={15} color={Theme.colors.textMuted} />
        </View>
      ) : null}
    </CardWrapper>
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

      {shipment.sender ? <SenderChip sender={shipment.sender} /> : null}

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
      <View style={styles.offerBadgeRow}>
        <View style={styles.offerBadge}>
          <Ionicons name="cube" size={14} color={Theme.colors.black} />
          <Text style={styles.offerBadgeText}>Nuevo pedido para vos</Text>
        </View>
        <OfferCountdownBadge lastNotifiedAt={shipment.lastNotifiedAt} />
      </View>

      <Text style={styles.offerRoute}>
        {shipment.originCity} → {shipment.destinationCity}
      </Text>

      {shipment.sender ? <SenderChip sender={shipment.sender} /> : null}

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
        {route.carriesPassengers ? (
          <View style={[styles.routeMetaChip, styles.routeMetaChipPassengers]}>
            <Ionicons name="people" size={12} color={Theme.colors.lime} />
            <Text style={[styles.routeMetaText, { color: Theme.colors.lime }]}>
              {route.seatsOffered ?? 0} asientos{route.pricePerSeat ? ` · $${route.pricePerSeat}` : ''}
            </Text>
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

// Selector de día: flechas ‹ › para mover ±1 día, chips Ayer/Hoy/Mañana y botón calendario.
export function DaySelector({ selected, onSelect, onOpenCalendar }: {
  selected: Date
  onSelect: (d: Date) => void
  onOpenCalendar: () => void
}) {
  const today = startOfDay(new Date())
  const chips: { label: string; date: Date }[] = [
    { label: 'Ayer', date: addDays(today, -1) },
    { label: 'Hoy', date: today },
    { label: 'Mañana', date: addDays(today, 1) },
  ]

  return (
    <View style={styles.daySelector}>
      <TouchableOpacity style={styles.dayArrow} onPress={() => onSelect(addDays(selected, -1))} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.dayChips}>
        {chips.map(chip => {
          const active = isSameDay(chip.date, selected)
          return (
            <TouchableOpacity
              key={chip.label}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => onSelect(chip.date)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <TouchableOpacity style={styles.dayArrow} onPress={() => onSelect(addDays(selected, 1))} activeOpacity={0.7}>
        <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.dayCalendarBtn} onPress={onOpenCalendar} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={18} color={Theme.colors.black} />
      </TouchableOpacity>
    </View>
  )
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export type DayCount = { intercity: number; local: number }

// Grilla de mes (semana arranca lunes) con badge de cantidad de pedidos por día.
// El badge es lima si ese día tiene algún viaje INTERCITY programado (la señal
// principal de un calendario), y celeste si solo tiene demanda LOCAL (sin fecha
// real, agrupada en "hoy"). Si hay de los dos, se agrega un punto celeste chico
// junto al badge lima para no esconder que también hay demanda local ese día.
export function CalendarMonth({ month, counts, selected, daysOff, onSelectDay, onToggleDayOff, onPrevMonth, onNextMonth }: {
  month: Date
  counts: Record<string, DayCount>
  selected: Date | null
  daysOff?: Set<string>
  onSelectDay: (d: Date) => void
  onToggleDayOff?: (d: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const today = startOfDay(new Date())
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstOfMonth = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  // Offset con lunes como primer día (getDay: 0=Dom..6=Sáb).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7

  const cells: (Date | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeader}>
        <TouchableOpacity style={styles.dayArrow} onPress={onPrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={Theme.colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{MONTH_LABELS[monthIndex]} {year}</Text>
        <TouchableOpacity style={styles.dayArrow} onPress={onNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.calWeekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <View key={i} style={styles.calWeekCell}>
            <Text style={styles.calWeekText}>{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calWeekRow}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={styles.calDayCell} />
            const dayCount = counts[dayKey(date)]
            const intercity = dayCount?.intercity ?? 0
            const local = dayCount?.local ?? 0
            const total = intercity + local
            const isToday = isSameDay(date, today)
            const isSelected = selected && isSameDay(date, selected)
            const isPast = date < today
            const isOff = daysOff?.has(dayKey(date)) ?? false
            return (
              <TouchableOpacity
                key={di}
                style={styles.calDayCell}
                onPress={() => onSelectDay(date)}
                onLongPress={!isPast && onToggleDayOff ? () => onToggleDayOff(date) : undefined}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.calDayInner,
                  isToday && styles.calDayToday,
                  isSelected && styles.calDaySelected,
                  isOff && styles.calDayOff,
                ]}>
                  <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected, isOff && styles.calDayTextOff]}>
                    {date.getDate()}
                  </Text>
                  {isOff ? (
                    <Ionicons name="moon" size={10} color={Theme.colors.textSubtle} />
                  ) : total > 0 ? (
                    <View style={styles.calDayBadgeWrap}>
                      <View style={[styles.calDayBadge, intercity === 0 && styles.calDayBadgeLocal]}>
                        <Text style={styles.calDayBadgeText}>{total}</Text>
                      </View>
                      {intercity > 0 && local > 0 ? <View style={styles.calDayLocalDot} /> : null}
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
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

export const styles = themedStyles(() => StyleSheet.create({
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

  // Selector de día
  daySelector: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayArrow: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  dayChips: {
    flex: 1, flexDirection: 'row', gap: 6,
    backgroundColor: Theme.colors.surface, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  dayChip: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  dayChipActive: { backgroundColor: Theme.colors.lime },
  dayChipText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 12 },
  dayChipTextActive: { color: Theme.colors.black },
  dayCalendarBtn: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },

  // Calendario
  calCard: {
    padding: 14, borderRadius: 20, gap: 8,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  calTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15, textTransform: 'capitalize' },
  calWeekRow: { flexDirection: 'row' },
  calWeekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calWeekText: { color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 11 },
  calDayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  calDayInner: {
    width: '100%', height: '100%', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  calDayToday: { borderWidth: 1, borderColor: Theme.colors.lime },
  calDaySelected: { backgroundColor: Theme.colors.lime },
  calDayOff: { backgroundColor: Theme.colors.backgroundDeep, opacity: 0.6 },
  calDayText: { color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 13 },
  calDayTextSelected: { color: Theme.colors.black, fontFamily: Theme.fonts.bold },
  calDayTextOff: { color: Theme.colors.textSubtle, textDecorationLine: 'line-through' },
  calDayBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  calDayBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.lime,
  },
  calDayBadgeLocal: { backgroundColor: Theme.colors.info },
  calDayBadgeText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 9 },
  calDayLocalDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Theme.colors.info },

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
  activeJobCardDone: { borderColor: Theme.colors.border, opacity: 0.75 },
  activeJobBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.lime,
  },
  deliveredBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.lime,
  },
  deliveredBadgeText: { color: Theme.colors.lime, fontFamily: Theme.fonts.bold, fontSize: 12 },
  jobAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobAddressText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 },
  viewMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, backgroundColor: Theme.colors.lime, marginTop: 4,
  },
  viewMapBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },
  jobDetailHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
    marginTop: 2, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Theme.colors.border,
  },
  jobDetailHintText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 12 },

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
  routeMetaChipPassengers: { backgroundColor: 'rgba(184,255,0,0.10)', borderWidth: 1, borderColor: Theme.colors.lime },

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
  offerBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  offerBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.colors.lime,
  },
  offerBadgeText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 12 },
  offerRoute: { color: Theme.colors.text, fontFamily: Theme.fonts.display, fontSize: 24, lineHeight: 28 },
  senderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', maxWidth: '100%',
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: Theme.colors.backgroundDeep,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  senderChipText: { flexShrink: 1, color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 12 },
  senderChipRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  senderChipRatingText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 11 },
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
}))
