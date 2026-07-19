import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { Avatar } from '../../../components/ui/Avatar'
import { IconButton } from '../../../components/ui/IconButton'
import { Theme } from '../../../constants/theme'
import { themedStyles } from '../../../lib/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { PACKAGE_SIZE_LABELS, VEHICLE_LABELS, styles as panel } from '../_panel'

type JobStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

type JobDetail = {
  id: string
  status: JobStatus
  pickedUpAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
  estimatedEarning: number
  shipment: {
    id: string
    senderId: string
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
    sender: { id: string; name: string; avatarUrl: string | null; rating: number; ratingCount: number } | null
  }
  route: {
    kind: 'INTERCITY' | 'LOCAL'
    vehicleType: string
    licensePlate: string | null
    vehicleModel: string | null
    vehicleColor: string | null
    pricePerKg: number | null
  }
}

// "18 jul · 14:30" en hora local.
function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '')
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function money(amount: number) {
  return `$${amount.toLocaleString('es-AR')}`
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('')
}

function callPhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return
  Linking.openURL(`tel:${cleaned}`).catch(() => {})
}

type TimelineStep = { label: string; at: string | null; done: boolean; danger?: boolean }

function buildTimeline(job: JobDetail): TimelineStep[] {
  if (job.status === 'CANCELLED') {
    const steps: TimelineStep[] = [{ label: 'Aceptaste el pedido', at: job.createdAt, done: true }]
    if (job.pickedUpAt) steps.push({ label: 'Retiraste el paquete', at: job.pickedUpAt, done: true })
    steps.push({ label: 'Trabajo cancelado', at: job.updatedAt, done: true, danger: true })
    return steps
  }
  return [
    { label: 'Aceptaste el pedido', at: job.createdAt, done: true },
    { label: 'Retiraste el paquete', at: job.pickedUpAt, done: !!job.pickedUpAt },
    { label: 'Entregaste el paquete', at: job.deliveredAt, done: !!job.deliveredAt },
  ]
}

function statusMeta(job: JobDetail): { label: string; sub: string; icon: React.ComponentProps<typeof Ionicons>['name']; tone: 'done' | 'active' | 'cancelled' } {
  if (job.status === 'COMPLETED') {
    return { label: 'Entregado', sub: fmtDateTime(job.deliveredAt) ?? 'Completado', icon: 'checkmark-circle', tone: 'done' }
  }
  if (job.status === 'CANCELLED') {
    return { label: 'Cancelado', sub: fmtDateTime(job.updatedAt) ?? 'Trabajo cancelado', icon: 'close-circle', tone: 'cancelled' }
  }
  if (!job.pickedUpAt) {
    return { label: 'Pendiente de retiro', sub: 'Todavía no retiraste el paquete', icon: 'cube-outline', tone: 'active' }
  }
  return { label: 'En camino a entregar', sub: 'Paquete retirado, en tránsito', icon: 'bicycle-outline', tone: 'active' }
}

export default function DriverJobDetailScreen() {
  const { token } = useAuth()
  const params = useLocalSearchParams<{ id: string }>()

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!token || !params.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ job: JobDetail }>(`/shipments/jobs/${params.id}`, token)
      setJob(data.job)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el pedido')
    } finally {
      setLoading(false)
    }
  }, [token, params.id])

  useFocusEffect(useCallback(() => { void fetchJob() }, [fetchJob]))

  const headerTitle = !job
    ? 'Detalle del pedido'
    : job.status === 'COMPLETED'
      ? 'Pedido entregado'
      : job.status === 'CANCELLED'
        ? 'Pedido cancelado'
        : 'Trabajo en curso'

  const vehicleText = job
    ? [VEHICLE_LABELS[job.route.vehicleType] ?? job.route.vehicleType, job.route.vehicleModel, job.route.licensePlate, job.route.vehicleColor]
        .filter(Boolean).join(' · ')
    : ''

  return (
    <ScreenSafeArea style={panel.container}>
      <View style={panel.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View style={panel.headerCopy}>
          <Text style={panel.headerLabel}>Modo conductor</Text>
          <Text style={panel.headerTitle}>{headerTitle}</Text>
        </View>
      </View>

      {loading && !job ? (
        <View style={panel.centerState}>
          <ActivityIndicator color={Theme.colors.lime} />
        </View>
      ) : error && !job ? (
        <View style={s.errorState}>
          <Ionicons name="alert-circle-outline" size={40} color={Theme.colors.textMuted} />
          <Text style={s.errorStateText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => void fetchJob()} activeOpacity={0.85}>
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : job ? (
        <ScrollView contentContainerStyle={panel.content} showsVerticalScrollIndicator={false}>
          {/* ── Estado ── */}
          {(() => {
            const meta = statusMeta(job)
            return (
              <View style={[
                s.statusHero,
                meta.tone === 'done' && s.statusHeroDone,
                meta.tone === 'active' && s.statusHeroActive,
                meta.tone === 'cancelled' && s.statusHeroCancelled,
              ]}>
                <Ionicons
                  name={meta.icon}
                  size={28}
                  color={meta.tone === 'cancelled' ? Theme.colors.danger : Theme.colors.lime}
                />
                <View style={s.statusHeroCopy}>
                  <Text style={s.statusHeroLabel}>{meta.label}</Text>
                  <Text style={s.statusHeroSub}>{meta.sub}</Text>
                </View>
              </View>
            )
          })()}

          <Text style={panel.offerRoute}>
            {job.shipment.originCity} → {job.shipment.destinationCity}
          </Text>

          {/* ── Línea de tiempo ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Progreso</Text>
            <View style={s.timeline}>
              {buildTimeline(job).map((step, i, arr) => (
                <View key={step.label} style={s.timelineRow}>
                  <View style={s.timelineGutter}>
                    <View style={[
                      s.timelineDot,
                      step.done && s.timelineDotDone,
                      step.danger && s.timelineDotDanger,
                    ]}>
                      {step.done ? (
                        <Ionicons
                          name={step.danger ? 'close' : 'checkmark'}
                          size={12}
                          color={Theme.colors.black}
                        />
                      ) : null}
                    </View>
                    {i < arr.length - 1 ? (
                      <View style={[s.timelineLine, arr[i + 1].done && !arr[i + 1].danger && s.timelineLineDone]} />
                    ) : null}
                  </View>
                  <View style={s.timelineCopy}>
                    <Text style={[
                      s.timelineLabel,
                      !step.done && s.timelineLabelPending,
                      step.danger && s.timelineLabelDanger,
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={s.timelineTime}>{fmtDateTime(step.at) ?? 'Pendiente'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Direcciones ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Ruta del paquete</Text>
            <View style={s.routePoint}>
              <View style={[s.routeDot, s.routeDotOrigin]} />
              <View style={s.routePointCopy}>
                <Text style={s.routePointLabel}>RETIRO</Text>
                <Text style={s.routePointAddress}>{job.shipment.originAddress}</Text>
              </View>
            </View>
            <View style={s.routeConnector} />
            <View style={s.routePoint}>
              <View style={[s.routeDot, s.routeDotDelivery]} />
              <View style={s.routePointCopy}>
                <Text style={s.routePointLabel}>ENTREGA</Text>
                <Text style={s.routePointAddress}>{job.shipment.deliveryAddress}</Text>
              </View>
            </View>
          </View>

          {/* ── Remitente (perfil público) ── */}
          {job.shipment.sender ? (
            <TouchableOpacity
              style={s.senderCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: job.shipment.sender!.id } })}
            >
              <Avatar initials={initialsOf(job.shipment.sender.name)} size={44} />
              <View style={s.senderCopy}>
                <Text style={s.senderLabel}>REMITENTE</Text>
                <Text style={s.senderName}>{job.shipment.sender.name}</Text>
                <View style={s.senderRating}>
                  <Ionicons name="star" size={12} color={Theme.colors.lime} />
                  <Text style={s.senderRatingText}>
                    {job.shipment.sender.ratingCount > 0
                      ? `${job.shipment.sender.rating.toFixed(1)} · ${job.shipment.sender.ratingCount} reseñas`
                      : 'Nuevo en LLEVO'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {/* ── Ganancia estimada ── */}
          {job.estimatedEarning > 0 ? (
            <View style={s.earningCard}>
              <View style={s.earningTop}>
                <Ionicons name="wallet-outline" size={18} color={Theme.colors.lime} />
                <Text style={s.earningLabel}>
                  {job.status === 'COMPLETED' ? 'Ganancia estimada' : 'Vas a ganar (estimado)'}
                </Text>
              </View>
              <Text style={s.earningValue}>{money(job.estimatedEarning)}</Text>
              <Text style={s.earningNote}>
                Estimado según peso y precio por kg, neto de comisión. El cobro real se habilita cuando activemos pagos.
              </Text>
            </View>
          ) : null}

          {/* ── Detalles ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Detalles del paquete</Text>
            <View style={s.detailList}>
              <DetailRow icon="scale-outline" label="Peso" value={`${job.shipment.weightKg} kg`} />
              <DetailRow
                icon="cube-outline"
                label="Tamaño"
                value={PACKAGE_SIZE_LABELS[job.shipment.packageSize] ?? job.shipment.packageSize}
              />
              {job.shipment.preferredDate ? (
                <DetailRow
                  icon="calendar-outline"
                  label="Fecha programada"
                  value={new Date(job.shipment.preferredDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
              ) : null}
              {vehicleText ? (
                <DetailRow icon="car-outline" label="Vehículo" value={vehicleText} />
              ) : null}
            </View>
          </View>

          {/* ── Contacto y receptor ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Contacto</Text>
            <View style={s.detailList}>
              <TouchableOpacity
                style={s.contactRow}
                onPress={() => callPhone(job.shipment.pickupContactPhone)}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={15} color={Theme.colors.lime} style={s.detailIcon} />
                <View style={s.detailCopy}>
                  <Text style={s.detailLabel}>CONTACTO EN ORIGEN</Text>
                  <Text style={s.detailValue}>{job.shipment.pickupContactName}</Text>
                  <Text style={s.contactPhone}>{job.shipment.pickupContactPhone}</Text>
                </View>
                <Ionicons name="call" size={16} color={Theme.colors.lime} />
              </TouchableOpacity>
              {job.shipment.recipientDetails ? (
                <DetailRow icon="person-outline" label="Receptor" value={job.shipment.recipientDetails} />
              ) : null}
              {job.shipment.notes ? (
                <DetailRow icon="document-text-outline" label="Notas" value={job.shipment.notes} />
              ) : null}
            </View>
          </View>

          {/* ── Acción: solo si el trabajo sigue activo ── */}
          {job.status === 'ACTIVE' ? (
            <TouchableOpacity style={s.mapCta} onPress={() => router.push('/driver/job')} activeOpacity={0.85}>
              <Ionicons name="navigate" size={18} color={Theme.colors.black} />
              <Text style={s.mapCtaText}>Ver mapa y navegar</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
    </ScreenSafeArea>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={15} color={Theme.colors.lime} style={s.detailIcon} />
      <View style={s.detailCopy}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

const s = themedStyles(() => StyleSheet.create({
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  errorStateText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 14,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  retryBtnText: { color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 14 },

  statusHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 20, borderWidth: 1.5,
  },
  statusHeroDone: { backgroundColor: 'rgba(190,242,100,0.08)', borderColor: Theme.colors.lime },
  statusHeroActive: { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.lime },
  statusHeroCancelled: { backgroundColor: Theme.colors.dangerSurface, borderColor: Theme.colors.danger },
  statusHeroCopy: { flex: 1 },
  statusHeroLabel: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 18 },
  statusHeroSub: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },

  card: {
    padding: 18, borderRadius: 20, gap: 14,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  cardTitle: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // Timeline
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineGutter: { alignItems: 'center', width: 22 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
    borderWidth: 1.5, borderColor: Theme.colors.border,
  },
  timelineDotDone: { backgroundColor: Theme.colors.lime, borderColor: Theme.colors.lime },
  timelineDotDanger: { backgroundColor: Theme.colors.danger, borderColor: Theme.colors.danger },
  timelineLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: Theme.colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: Theme.colors.lime },
  timelineCopy: { flex: 1, paddingBottom: 18 },
  timelineLabel: { color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 14 },
  timelineLabelPending: { color: Theme.colors.textMuted },
  timelineLabelDanger: { color: Theme.colors.danger },
  timelineTime: { color: Theme.colors.textSubtle, fontFamily: Theme.fonts.medium, fontSize: 12, marginTop: 2 },

  // Ruta
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot: { width: 11, height: 11, borderRadius: 6, marginTop: 3, flexShrink: 0 },
  routeDotOrigin: { backgroundColor: Theme.colors.text, borderWidth: 2, borderColor: Theme.colors.textMuted },
  routeDotDelivery: { backgroundColor: Theme.colors.lime },
  routeConnector: { width: 2, height: 14, backgroundColor: Theme.colors.border, marginLeft: 4 },
  routePointCopy: { flex: 1 },
  routePointLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  routePointAddress: { color: Theme.colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 14, lineHeight: 19 },

  // Remitente
  senderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  senderCopy: { flex: 1 },
  senderLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  senderName: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15, marginTop: 2 },
  senderRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  senderRatingText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },

  // Ganancia
  earningCard: {
    padding: 20, borderRadius: 20, gap: 6,
    backgroundColor: 'rgba(190,242,100,0.08)',
    borderWidth: 1.5, borderColor: Theme.colors.lime,
  },
  earningTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earningLabel: {
    color: Theme.colors.lime, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  earningValue: { color: Theme.colors.text, fontFamily: Theme.fonts.display, fontSize: 32, lineHeight: 36 },
  earningNote: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 17 },

  // Detalles
  detailList: { gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { marginTop: 2 },
  detailCopy: { flex: 1 },
  detailLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  detailValue: { color: Theme.colors.text, fontFamily: Theme.fonts.medium, fontSize: 14, lineHeight: 20, marginTop: 2 },
  contactPhone: { color: Theme.colors.lime, fontFamily: Theme.fonts.semiBold, fontSize: 14, marginTop: 2 },

  // CTA
  mapCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16, backgroundColor: Theme.colors.lime,
  },
  mapCtaText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 15 },
}))