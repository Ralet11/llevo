import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { DriverOnlineBar } from '../../../components/app/DriverOnlineBar'
import { Theme } from '../../../constants/theme'
import { themedStyles } from '../../../lib/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import {
  CalendarMonth,
  dayKey,
  startOfDay,
  styles,
  type AgendaItem,
  type DayCount,
} from '../_panel'

function monthRange(month: Date): { from: string; to: string } {
  const from = new Date(month.getFullYear(), month.getMonth(), 1)
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function DriverCalendarioScreen() {
  const { token } = useAuth()
  const [month, setMonth] = useState<Date>(() => startOfDay(new Date()))
  const [counts, setCounts] = useState<Record<string, DayCount>>({})
  const [daysOff, setDaysOff] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchDaysOff = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.get<{ dates: string[] }>('/drivers/days-off', token)
      setDaysOff(new Set(data.dates))
    } catch {}
  }, [token])

  // Marca/desmarca un día como no disponible: los viajes INTERCITY programados
  // dejan de ofrecerse ese día (la demanda LOCAL no se ve afectada).
  async function handleToggleDayOff(d: Date) {
    if (!token) return
    const key = dayKey(d)
    const wasOff = daysOff.has(key)
    setDaysOff(prev => {
      const next = new Set(prev)
      if (wasOff) next.delete(key)
      else next.add(key)
      return next
    })
    try {
      if (wasOff) await api.delete(`/drivers/days-off/${key}`, token)
      else await api.post('/drivers/days-off', { date: key }, token)
    } catch {
      // Revert si falló la llamada
      setDaysOff(prev => {
        const next = new Set(prev)
        if (wasOff) next.add(key)
        else next.delete(key)
        return next
      })
    }
  }

  const fetchCounts = useCallback(async (forMonth: Date) => {
    if (!token) return
    setLoading(true)
    try {
      const { from, to } = monthRange(forMonth)
      const data = await api.get<{ items: AgendaItem[] }>(
        `/shipments/agenda-for-driver?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        token,
      )
      const next: Record<string, DayCount> = {}
      for (const item of data.items) {
        const key = dayKey(new Date(item.date))
        const bucket = next[key] ?? { intercity: 0, local: 0 }
        if (item.isLocal) bucket.local += 1
        else bucket.intercity += 1
        next[key] = bucket
      }
      setCounts(next)
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useFocusEffect(
    useCallback(() => {
      void fetchCounts(month)
      void fetchDaysOff()
    }, [fetchCounts, fetchDaysOff, month])
  )

  function handleSelectDay(d: Date) {
    router.push({ pathname: '/driver/day/[date]', params: { date: dayKey(d) } })
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Calendario</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DriverOnlineBar />

        {loading && Object.keys(counts).length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Theme.colors.lime} />
          </View>
        ) : (
          <CalendarMonth
            month={month}
            counts={counts}
            selected={null}
            daysOff={daysOff}
            onSelectDay={handleSelectDay}
            onToggleDayOff={d => void handleToggleDayOff(d)}
            onPrevMonth={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            onNextMonth={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          />
        )}

        <View style={local.legendRow}>
          <View style={local.legendItem}>
            <View style={[local.legendDot, { backgroundColor: Theme.colors.lime }]} />
            <Text style={local.legendItemText}>Viajes programados</Text>
          </View>
          <View style={local.legendItem}>
            <View style={[local.legendDot, { backgroundColor: Theme.colors.info }]} />
            <Text style={local.legendItemText}>Demanda local</Text>
          </View>
        </View>

        <View style={local.legend}>
          <Ionicons name="information-circle-outline" size={16} color={Theme.colors.textMuted} />
          <Text style={local.legendText}>
            El número en cada día son los pedidos que tenés agendados. Mantené presionado un día para marcarlo como no disponible.
          </Text>
        </View>
      </ScrollView>
    </ScreenSafeArea>
  )
}

const local = themedStyles(() => StyleSheet.create({
  legendRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendItemText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  legendText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 17 },
}))
