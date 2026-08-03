import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { themedStyles } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { getSocket } from '../../lib/socket'
import { fetchDriverTravelOpportunities, fetchRideRequests, respondBooking, respondToTravelRequest, type DriverTravelOpportunity, type RideRequest, type RideBookingStatus } from '../../lib/trips'

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('')
}

function formatDate(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

const STATUS_META: Partial<Record<RideBookingStatus, { label: string; color: string }>> = {
  APPROVED: { label: 'Aprobado · esperando pago', color: Theme.colors.lime },
  PAID: { label: 'Confirmado', color: Theme.colors.success },
}

export default function DriverRideRequestsScreen() {
  const { token } = useAuth()
  const [requests, setRequests] = useState<RideRequest[]>([])
  const [opportunities, setOpportunities] = useState<DriverTravelOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const [nextRequests, nextOpportunities] = await Promise.all([fetchRideRequests(token), fetchDriverTravelOpportunities(token)])
      setRequests(nextRequests)
      setOpportunities(nextOpportunities)
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  // Socket: nueva solicitud entrante o cambio de estado.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onChange = () => void load()
    socket.on('ride:new_request', onChange)
    socket.on('ride:status_changed', onChange)
    socket.on('travel-request:new_opportunity', onChange)
    return () => {
      socket.off('ride:new_request', onChange)
      socket.off('ride:status_changed', onChange)
      socket.off('travel-request:new_opportunity', onChange)
    }
  }, [load])

  async function respond(id: string, action: 'approve' | 'reject') {
    if (!token) return
    setBusyId(id)
    try {
      await respondBooking(token, id, action)
      await load()
    } catch (err) {
      Alert.alert('No se pudo responder', err instanceof Error ? err.message : 'Intentá de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  async function respondOpportunity(opportunity: DriverTravelOpportunity, action: 'accept' | 'reject') {
    if (!token) return
    setBusyId(opportunity.id)
    try {
      await respondToTravelRequest(token, opportunity.travelRequest.id, action)
      await load()
    } catch (err) {
      Alert.alert('No se pudo responder', err instanceof Error ? err.message : 'Intentá de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  function confirmReject(r: RideRequest) {
    Alert.alert('Rechazar solicitud', `¿Rechazar a ${r.passenger.name.split(' ')[0]}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: () => void respond(r.id, 'reject') },
    ])
  }

  return (
    <ScreenSafeArea style={s.container}>
      <View style={s.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View style={s.headerCopy}>
          <Text style={s.headerLabel}>Modo conductor</Text>
          <Text style={s.headerTitle}>Solicitudes de viaje</Text>
        </View>
      </View>

      {loading && requests.length === 0 && opportunities.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={Theme.colors.lime} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {requests.length === 0 && opportunities.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="people-outline" size={26} color={Theme.colors.lime} /></View>
              <Text style={s.emptyTitle}>No tenés solicitudes por ahora</Text>
              <Text style={s.emptyText}>Cuando un pasajero pida sumarse a uno de tus viajes, lo vas a ver acá.</Text>
            </View>
          ) : (
            <>
              {opportunities.map(opportunity => (
                <View key={opportunity.id} style={s.card}>
                  <View style={s.opportunityHeader}>
                    <Ionicons name={opportunity.travelRequest.status === 'PUBLISHED' ? 'megaphone-outline' : 'search'} size={18} color={Theme.colors.lime} />
                    <Text style={s.opportunityLabel}>{opportunity.travelRequest.status === 'PUBLISHED' ? 'Viaje publicado' : 'Nueva oportunidad'}</Text>
                  </View>
                  <View style={s.tripInfo}>
                    <Text style={s.route}>{opportunity.travelRequest.originCity} → {opportunity.travelRequest.destinationCity}</Text>
                    <View style={s.metaRow}>
                      <View style={s.metaChip}><Ionicons name="calendar-outline" size={12} color={Theme.colors.textMuted} /><Text style={s.metaChipText}>{formatDate(opportunity.travelRequest.date)}</Text></View>
                      <View style={s.metaChip}><Ionicons name="people" size={12} color={Theme.colors.textMuted} /><Text style={s.metaChipText}>{opportunity.travelRequest.seats} {opportunity.travelRequest.seats === 1 ? 'lugar' : 'lugares'}</Text></View>
                    </View>
                  </View>
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.rejectBtn, busyId === opportunity.id && s.btnDisabled]} activeOpacity={0.8} onPress={() => void respondOpportunity(opportunity, 'reject')} disabled={busyId === opportunity.id}><Text style={s.rejectText}>No puedo</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.approveBtn, busyId === opportunity.id && s.btnDisabled]} activeOpacity={0.8} onPress={() => void respondOpportunity(opportunity, 'accept')} disabled={busyId === opportunity.id}>
                      {busyId === opportunity.id ? <ActivityIndicator size="small" color={Theme.colors.black} /> : <Text style={s.approveText}>Aceptar viaje</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {requests.map(r => {
              const meta = STATUS_META[r.status]
              return (
                <View key={r.id} style={s.card}>
                  <TouchableOpacity
                    style={s.passengerRow}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.passenger.id } })}
                  >
                    <Avatar initials={initialsOf(r.passenger.name)} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.passengerName}>{r.passenger.name}</Text>
                      <Text style={s.passengerMeta}>
                        {r.passenger.ratingCount > 0 ? `★ ${r.passenger.rating.toFixed(1)} · ${r.passenger.ratingCount} reseñas` : 'Nuevo en LLEVO'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
                  </TouchableOpacity>

                  <View style={s.tripInfo}>
                    <Text style={s.route}>{r.originCity} → {r.destinationCity}</Text>
                    <View style={s.metaRow}>
                      <View style={s.metaChip}>
                        <Ionicons name="calendar-outline" size={12} color={Theme.colors.textMuted} />
                        <Text style={s.metaChipText}>{formatDate(r.date)}{r.route.departureTimeFrom ? ` · ${r.route.departureTimeFrom}` : ''}</Text>
                      </View>
                      <View style={s.metaChip}>
                        <Ionicons name="people" size={12} color={Theme.colors.textMuted} />
                        <Text style={s.metaChipText}>{r.seats} {r.seats === 1 ? 'lugar' : 'lugares'}</Text>
                      </View>
                      {r.pricePerSeat != null ? (
                        <View style={s.metaChip}>
                          <Ionicons name="pricetag-outline" size={12} color={Theme.colors.textMuted} />
                          <Text style={s.metaChipText}>${r.pricePerSeat.toLocaleString('es-AR')}/asiento</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {r.status === 'PENDING' ? (
                    <View style={s.actions}>
                      <TouchableOpacity style={[s.rejectBtn, busyId === r.id && s.btnDisabled]} activeOpacity={0.8} onPress={() => confirmReject(r)} disabled={busyId === r.id}>
                        <Ionicons name="close" size={18} color={Theme.colors.textMuted} />
                        <Text style={s.rejectText}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.approveBtn, busyId === r.id && s.btnDisabled]} activeOpacity={0.8} onPress={() => void respond(r.id, 'approve')} disabled={busyId === r.id}>
                        {busyId === r.id
                          ? <ActivityIndicator size="small" color={Theme.colors.black} />
                          : <>
                              <Ionicons name="checkmark" size={18} color={Theme.colors.black} />
                              <Text style={s.approveText}>Aprobar</Text>
                            </>}
                      </TouchableOpacity>
                    </View>
                  ) : meta ? (
                    <View style={[s.statusPill, { borderColor: meta.color }]}>
                      <Text style={[s.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  ) : null}
                </View>
              )
              })}
            </>
          )}
        </ScrollView>
      )}
    </ScreenSafeArea>
  )
}

const s = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  headerCopy: { flex: 1 },
  headerLabel: { color: Theme.colors.lime, fontFamily: Theme.fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 12 },

  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 20, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.backgroundDeep },
  emptyTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15, textAlign: 'center' },
  emptyText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 20, textAlign: 'center' },

  card: { padding: 18, borderRadius: 20, gap: 12, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passengerName: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  passengerMeta: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, marginTop: 2 },
  tripInfo: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderColor: Theme.colors.border },
  route: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: Theme.colors.backgroundDeep },
  metaChipText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11 },

  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, backgroundColor: Theme.colors.surfaceElevated, borderWidth: 1, borderColor: Theme.colors.border },
  rejectText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 14 },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, backgroundColor: Theme.colors.lime },
  approveText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  statusPill: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  statusPillText: { fontFamily: Theme.fonts.bold, fontSize: 12 },
  opportunityHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  opportunityLabel: { color: Theme.colors.lime, fontFamily: Theme.fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
}))
