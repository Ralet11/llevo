import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { styles } from '../_panel'

type DriverStats = {
  completedTotal: number
  completedToday: number
  completedThisWeek: number
  activeCount: number
  earningsTotal: number
  earningsThisWeek: number
  currency: string
}

function money(amount: number, currency: string) {
  return `$${amount.toLocaleString('es-AR')}${currency === 'ARS' ? '' : ` ${currency}`}`
}

export default function DriverGananciasScreen() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DriverStats | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      void fetchStats()
    }, [token])
  )

  async function fetchStats() {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.get<{ stats: DriverStats }>('/drivers/stats', token)
      setStats(data.stats)
    } catch {} finally {
      setLoading(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Ganancias</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !stats ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Theme.colors.lime} />
          </View>
        ) : (
          <>
            {/* Destacado: esta semana */}
            <View style={g.heroCard}>
              <Text style={g.heroLabel}>Esta semana (estimado)</Text>
              <Text style={g.heroValue}>{money(stats?.earningsThisWeek ?? 0, stats?.currency ?? 'ARS')}</Text>
              <Text style={g.heroSub}>{stats?.completedThisWeek ?? 0} entregas completadas</Text>
            </View>

            {/* Grid de stats */}
            <View style={g.grid}>
              <StatCard icon="wallet-outline" label="Ganado total" value={money(stats?.earningsTotal ?? 0, stats?.currency ?? 'ARS')} />
              <StatCard icon="cube-outline" label="Entregas" value={String(stats?.completedTotal ?? 0)} />
              <StatCard icon="today-outline" label="Hoy" value={String(stats?.completedToday ?? 0)} />
              <StatCard icon="flash-outline" label="Activas" value={String(stats?.activeCount ?? 0)} />
            </View>

            <View style={g.note}>
              <Ionicons name="information-circle-outline" size={15} color={Theme.colors.textMuted} />
              <Text style={g.noteText}>
                Las ganancias son una estimación según peso y precio por kg. El cobro real se habilita cuando activemos pagos.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenSafeArea>
  )
}

function StatCard({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={g.statCard}>
      <Ionicons name={icon} size={18} color={Theme.colors.lime} />
      <Text style={g.statValue}>{value}</Text>
      <Text style={g.statLabel}>{label}</Text>
    </View>
  )
}

const g = StyleSheet.create({
  heroCard: {
    padding: 22, borderRadius: 22, gap: 6,
    backgroundColor: 'rgba(190,242,100,0.08)',
    borderWidth: 1.5, borderColor: Theme.colors.lime,
  },
  heroLabel: {
    color: Theme.colors.lime, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  heroValue: { color: Theme.colors.text, fontFamily: Theme.fonts.display, fontSize: 36, lineHeight: 40 },
  heroSub: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%', flexGrow: 1,
    padding: 16, borderRadius: 18, gap: 6,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  statValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 20 },
  statLabel: {
    color: Theme.colors.textSubtle, fontFamily: Theme.fonts.medium,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
  },

  note: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    padding: 14, borderRadius: 14, backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  noteText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 17 },
})
