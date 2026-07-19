import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { ShipmentListRow } from '../../components/app/home/ShipmentListRow'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { fetchMyShipments, type MyShipment } from '../../lib/shipments'

export default function HistoryScreen() {
  const { token } = useAuth()
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const [shipments, setShipments] = useState<MyShipment[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      if (!token) return

      setLoading(true)
      fetchMyShipments(token)
        .then(result => {
          if (!cancelled) setShipments(result)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })

      return () => {
        cancelled = true
      }
    }, [token])
  )

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Historial de solicitudes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.lime} />
        </View>
      ) : shipments.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Todavia no hiciste ningun envio</Text>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ShipmentListRow
              shipment={item}
              onPress={() => router.push({ pathname: '/shipment/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </ScreenSafeArea>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  headerSpacer: {
    width: 46,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
})
