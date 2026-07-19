import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { IconButton } from '../../../components/ui/IconButton'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import {
  ActiveJobCard,
  EmptyShipmentState,
  ShipmentOfferCard,
  UpcomingShipmentCard,
  addDays,
  isSameDay,
  startOfDay,
  styles,
  type AgendaItem,
  type UpcomingShipment,
} from '../_panel'

function parseDayParam(dateParam: string | undefined): Date {
  // "YYYY-MM-DD" sin hora: new Date(string) lo interpreta como UTC y en timezones
  // negativos (ej. Argentina) corre el dia hacia atras. Parseamos los componentes
  // a mano para construir la fecha en hora local, igual que dayKey() la genero.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam ?? '')
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  return startOfDay(new Date())
}

function dayRange(day: Date): { from: string; to: string } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function DriverDayDetailScreen() {
  const { token } = useAuth()
  const params = useLocalSearchParams<{ date: string }>()
  const day = parseDayParam(params.date)

  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [responseError, setResponseError] = useState<string | null>(null)

  const fetchDay = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const { from, to } = dayRange(parseDayParam(params.date))
      const data = await api.get<{ items: AgendaItem[] }>(
        `/shipments/agenda-for-driver?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        token,
      )
      setItems(data.items)
    } catch {} finally {
      setLoading(false)
    }
  }, [token, params.date])

  useFocusEffect(
    useCallback(() => {
      void fetchDay()
    }, [fetchDay])
  )

  async function handleRespond(shipmentId: string, action: 'accept' | 'reject') {
    if (!token) return
    setResponding(shipmentId)
    setResponseError(null)
    try {
      await api.post(`/shipments/${shipmentId}/respond`, { action }, token)
      if (action === 'accept') {
        router.replace('/driver/job')
        return
      }
      setItems(prev => prev.filter(i => !(i.kind === 'OFFER' && i.shipment.id === shipmentId)))
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : 'Error al responder. Intentá de nuevo.')
    } finally {
      setResponding(null)
    }
  }

  const today = startOfDay(new Date())
  const title = isSameDay(day, today)
    ? 'Pedidos de hoy'
    : isSameDay(day, addDays(today, 1))
      ? 'Pedidos de mañana'
      : isSameDay(day, addDays(today, -1))
        ? 'Pedidos de ayer'
        : `Pedidos · ${day.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`

  function renderItem(item: AgendaItem) {
    if (item.kind === 'JOB') {
      return (
        <ActiveJobCard
          key={item.job.id}
          job={item.job}
          onViewMap={() => router.push('/driver/job')}
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
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Theme.colors.lime} />
          </View>
        ) : items.length === 0 ? (
          <EmptyShipmentState />
        ) : (
          items.map(renderItem)
        )}
      </ScrollView>
    </ScreenSafeArea>
  )
}
