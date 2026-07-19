import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { getSocket } from '../../lib/socket'
import { cancelBooking, fetchMyBookings, type MyBooking, type RideBookingStatus } from '../../lib/trips'

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('')
}

function formatDate(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function MyTripsScreen() {
  const { token } = useAuth()
  const { palette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)
  const statusMeta: Record<RideBookingStatus, { label: string; color: string }> = {
    PENDING: { label: 'Esperando al conductor', color: colors.warning },
    APPROVED: { label: 'Aprobado · pagá tu lugar', color: colors.lime },
    REJECTED: { label: 'Rechazado', color: colors.danger },
    PAID: { label: 'Confirmado', color: colors.success },
    CANCELLED: { label: 'Cancelado', color: colors.textMuted },
  }
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      setBookings(await fetchMyBookings(token))
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  // Socket: refrescar cuando el conductor responde en tiempo real.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onChange = () => void load()
    socket.on('ride:status_changed', onChange)
    return () => { socket.off('ride:status_changed', onChange) }
  }, [load])

  function confirmCancel(b: MyBooking) {
    Alert.alert('Cancelar solicitud', `¿Cancelar tu lugar en ${b.originCity} → ${b.destinationCity}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => void handleCancel(b.id) },
    ])
  }

  async function handleCancel(id: string) {
    if (!token) return
    setBusyId(id)
    try {
      await cancelBooking(token, id)
      await load()
    } catch (err) {
      Alert.alert('No se pudo cancelar', err instanceof Error ? err.message : 'Intentá de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  function handlePay(b: MyBooking) {
    Alert.alert('Pagar tu lugar', `Muy pronto vas a poder pagar por MercadoPago tu lugar en ${b.originCity} → ${b.destinationCity}.`, [{ text: 'Entendido' }])
  }

  return (
    <ScreenSafeArea style={s.container}>
      <View style={s.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View style={s.headerCopy}>
          <Text style={s.headerLabel}>Modo usuario</Text>
          <Text style={s.headerTitle}>Mis viajes</Text>
        </View>
      </View>

      {loading && bookings.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={colors.lime} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {bookings.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="car-outline" size={26} color={colors.lime} /></View>
              <Text style={s.emptyTitle}>Todavía no pediste sumarte a un viaje</Text>
              <Text style={s.emptyText}>Buscá un viaje y solicitá tu lugar. Acá vas a ver el estado de tus solicitudes.</Text>
              <TouchableOpacity style={s.searchBtn} activeOpacity={0.85} onPress={() => router.replace('/(app)/travel')}>
                <Text style={s.searchBtnText}>Buscar un viaje</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bookings.map(b => {
              const meta = statusMeta[b.status]
              return (
                <View key={b.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.statusDot, { backgroundColor: meta.color }]} />
                    <Text style={[s.statusLabel, { color: meta.color }]}>{meta.label}</Text>
                    {b.pricePerSeat != null ? <Text style={s.price}>${b.pricePerSeat.toLocaleString('es-AR')}</Text> : null}
                  </View>

                  <Text style={s.route}>{b.originCity} → {b.destinationCity}</Text>
                  <Text style={s.date}>{formatDate(b.date)}{b.route.departureTimeFrom ? ` · ${b.route.departureTimeFrom}` : ''}</Text>

                  <TouchableOpacity
                    style={s.driverRow}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: b.route.driver.id } })}
                  >
                    <Avatar initials={initialsOf(b.route.driver.name)} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.driverName}>{b.route.driver.name}</Text>
                      <Text style={s.driverMeta}>
                        {b.route.driver.ratingCount > 0 ? `★ ${b.route.driver.rating.toFixed(1)}` : 'Nuevo'} · {b.seats} {b.seats === 1 ? 'lugar' : 'lugares'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>

                  {b.status === 'APPROVED' ? (
                    <TouchableOpacity style={s.payBtn} activeOpacity={0.85} onPress={() => handlePay(b)}>
                      <Ionicons name="card-outline" size={18} color={colors.black} />
                      <Text style={s.payBtnText}>Pagar mi lugar</Text>
                    </TouchableOpacity>
                  ) : null}

                  {b.status === 'PENDING' || b.status === 'APPROVED' ? (
                    <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => confirmCancel(b)} disabled={busyId === b.id}>
                      {busyId === b.id
                        ? <ActivityIndicator size="small" color={colors.danger} />
                        : <Text style={s.cancelBtnText}>Cancelar solicitud</Text>}
                    </TouchableOpacity>
                  ) : null}
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </ScreenSafeArea>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  headerCopy: { flex: 1 },
  headerLabel: { color: colors.lime, fontFamily: Theme.fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 12 },

  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundDeep },
  emptyTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 15, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  searchBtn: { marginTop: 6, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.lime },
  searchBtnText: { color: colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },

  card: { padding: 18, borderRadius: 20, gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontFamily: Theme.fonts.bold, fontSize: 12 },
  price: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },
  route: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 20, lineHeight: 24 },
  date: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, textTransform: 'capitalize' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border },
  driverName: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  driverMeta: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, backgroundColor: colors.lime },
  payBtnText: { color: colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: colors.danger, fontFamily: Theme.fonts.medium, fontSize: 13 },
})
