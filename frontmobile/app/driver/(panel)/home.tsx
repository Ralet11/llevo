import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { DriverOnlineBar } from '../../../components/app/DriverOnlineBar'
import { IconButton } from '../../../components/ui/IconButton'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { getSocket } from '../../../lib/socket'
import { useDriverRoutes } from '../../../lib/driverRoutes'
import { themedStyles } from '../../../lib/theme'
import { RadarPulse } from '../../../components/app/home/RadarPulse'
import {
  ActiveJobCard,
  DaySelector,
  EmptyShipmentState,
  ShipmentOfferCard,
  UpcomingShipmentCard,
  addDays,
  isSameDay,
  startOfDay,
  styles,
  type AgendaItem,
  type Shipment,
  type UpcomingShipment,
} from '../_panel'

export default function DriverInicioScreen() {
  const { driverProfile, token, user } = useAuth()
  const { routes, localRoutes, isLocalOnline, localCity, localBusy, setLocalOnline, refetchRoutes } = useDriverRoutes()
  const params = useLocalSearchParams<{ date?: string }>()
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [pendingShipment, setPendingShipment] = useState<Shipment | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()))
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [responseError, setResponseError] = useState<string | null>(null)

  // Recibe la fecha seleccionada desde el calendario (formato YYYY-MM-DD).
  // Se parsea a mano: new Date("YYYY-MM-DD") asume UTC y corre el dia en
  // timezones negativos (ej. Argentina).
  useEffect(() => {
    const match = params.date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.date) : null
    if (match) {
      const [, year, month, day] = match
      setSelectedDate(new Date(Number(year), Number(month) - 1, Number(day)))
    }
  }, [params.date])

  useFocusEffect(
    useCallback(() => {
      if (!driverProfile?.onboardingCompleted) { router.replace('/driver'); return }
      void fetchData()
    }, [token, driverProfile])
  )

  // Socket: recibe nueva oferta o cambio de estado en tiempo real
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !token) return

    function onNewOffer() {
      void fetchPending()
      void fetchAgenda()
    }

    function onStatusChanged() {
      void fetchAgenda()
    }

    // Cuando el socket reconecta, re-fetch por si se perdieron eventos
    function onReconnect() {
      void fetchPending()
      void fetchAgenda()
    }

    socket.on('shipment:new_offer', onNewOffer)
    socket.on('shipment:status_changed', onStatusChanged)
    socket.on('connect', onReconnect)

    return () => {
      socket.off('shipment:new_offer', onNewOffer)
      socket.off('shipment:status_changed', onStatusChanged)
      socket.off('connect', onReconnect)
    }
  }, [token])

  async function fetchData() {
    if (!token) return
    setLoading(true)
    await Promise.all([fetchAgenda(), fetchPending(), refetchRoutes()])
    setLoading(false)
  }

  async function fetchAgenda() {
    if (!token) return
    try {
      const data = await api.get<{ items: AgendaItem[] }>('/shipments/agenda-for-driver', token)
      setAgendaItems(data.items)
    } catch {}
  }

  async function fetchPending() {
    if (!token) return
    try {
      const data = await api.get<{ shipment: Shipment | null }>('/shipments/pending-for-driver', token)
      setPendingShipment(data.shipment)
    } catch {}
  }

  async function handleRespond(shipmentId: string, action: 'accept' | 'reject') {
    if (!token) return
    setResponding(shipmentId)
    setResponseError(null)
    try {
      await api.post(`/shipments/${shipmentId}/respond`, { action }, token)
      setPendingShipment(prev => (prev?.id === shipmentId ? null : prev))
      setAgendaItems(prev => prev.filter(i => !(i.kind === 'OFFER' && i.shipment.id === shipmentId)))
      if (action === 'accept') router.replace('/driver/job')
      else void fetchPending()
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : 'Error al responder. Intentá de nuevo.')
    } finally {
      setResponding(null)
    }
  }

  if (!driverProfile?.onboardingCompleted) return null

  // ─── Modo ONLINE: mapa a pantalla completa ─────────────────────────────────
  const today = startOfDay(new Date())
  const firstName = user?.name?.trim().split(' ')[0] || 'conductor'
  const ratingLabel = user && user.ratingCount > 0 ? user.rating.toFixed(1) : 'Nuevo'
  // El pedido pendiente ya se muestra arriba en "Nuevo pedido" mientras estamos online;
  // lo sacamos de la lista del dia para no duplicarlo.
  const dayItems = agendaItems.filter(i =>
    isSameDay(new Date(i.date), selectedDate) &&
    !(isLocalOnline && pendingShipment && i.kind === 'OFFER' && i.shipment.id === pendingShipment.id)
  )
  const dayTitle = isSameDay(selectedDate, today)
    ? 'Pedidos de hoy'
    : isSameDay(selectedDate, addDays(today, 1))
      ? 'Pedidos de mañana'
      : isSameDay(selectedDate, addDays(today, -1))
        ? 'Pedidos de ayer'
        : `Pedidos · ${selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`

  function renderAgendaItem(item: AgendaItem) {
    if (item.kind === 'JOB') {
      return (
        <ActiveJobCard
          key={item.job.id}
          job={item.job}
          onViewMap={() => router.replace('/driver/job')}
          onPress={() => router.push({ pathname: '/driver/job/[id]', params: { id: item.job.id } })}
        />
      )
    }
    const itemDay = startOfDay(new Date(item.date))
    if (itemDay > today) {
      const upcoming: UpcomingShipment = { ...item.shipment, preferredDate: item.date }
      return (
        <UpcomingShipmentCard
          key={item.shipment.id}
          shipment={upcoming}
          responding={responding === item.shipment.id}
          onAccept={() => void handleRespond(item.shipment.id, 'accept')}
          onReject={() => void handleRespond(item.shipment.id, 'reject')}
        />
      )
    }
    return (
      <ShipmentOfferCard
        key={item.shipment.id}
        shipment={item.shipment}
        responding={responding === item.shipment.id}
        error={responseError}
        onAccept={() => void handleRespond(item.shipment.id, 'accept')}
        onReject={() => void handleRespond(item.shipment.id, 'reject')}
      />
    )
  }

  return (
    <ScreenSafeArea style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/(app)')} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Hola, {firstName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(app)')} style={styles.resetBtn}>
          <Ionicons name="swap-horizontal" size={18} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DriverOnlineBar />

        {isLocalOnline && (
          pendingShipment ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nuevo pedido</Text>
              <ShipmentOfferCard
                shipment={pendingShipment}
                responding={responding === pendingShipment.id}
                error={responseError}
                onAccept={() => void handleRespond(pendingShipment.id, 'accept')}
                onReject={() => void handleRespond(pendingShipment.id, 'reject')}
              />
            </View>
          ) : (
            <View style={mapStyles.onlineHint}>
              <RadarPulse />
              <Text style={mapStyles.onlineHintText}>Esperando pedidos en {localCity}…</Text>
            </View>
          )
        )}

        {/* Selector de día */}
        <DaySelector
          selected={selectedDate}
          onSelect={setSelectedDate}
          onOpenCalendar={() => router.navigate('/driver/calendario' as never)}
        />

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

        {/* Pedidos del día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{dayTitle}</Text>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Theme.colors.lime} />
            </View>
          ) : dayItems.length === 0 ? (
            <EmptyShipmentState />
          ) : (
            dayItems.map(renderAgendaItem)
          )}
        </View>
      </ScrollView>

      {/* Botón fijo: ponerme online (el pausar ya vive en la franja de arriba) */}
      {!isLocalOnline && (
        <View style={mapStyles.onlineBar}>
          {localRoutes.length > 0 ? (
            <TouchableOpacity
              style={mapStyles.goOnlineBtn}
              activeOpacity={0.85}
              disabled={localBusy}
              onPress={() => void setLocalOnline(true)}
            >
              {localBusy
                ? <ActivityIndicator size="small" color={Theme.colors.black} />
                : <>
                    <Ionicons name="navigate" size={18} color={Theme.colors.black} />
                    <Text style={mapStyles.goOnlineBtnText}>Ponerme online en {localCity}</Text>
                  </>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nudgeCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/driver/setup', params: { mode: 'entrega', addingRoute: '1', kind: 'LOCAL' } })}
            >
              <View style={styles.nudgeIcon}>
                <Ionicons name="add" size={22} color={Theme.colors.black} />
              </View>
              <View style={styles.nudgeBody}>
                <Text style={styles.nudgeTitle}>Activá envíos locales</Text>
                <Text style={styles.nudgeDesc}>Creá una ruta local para poder ponerte online en tu ciudad.</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScreenSafeArea>
  )
}

const mapStyles = themedStyles(() => StyleSheet.create({
  onlineHint: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 20,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  onlineHintText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, textAlign: 'center' },

  onlineBar: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  goOnlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16, backgroundColor: Theme.colors.lime,
  },
  goOnlineBtnText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 15 },
}))
