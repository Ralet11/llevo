import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, Text } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { IconButton } from '../../components/ui/IconButton'
import { Button } from '../../components/ui/Button'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { fetchMyBookings, fetchMyRouteAlerts } from '../../lib/trips'
import { fetchMyShipments } from '../../lib/shipments'

export default function ActivityScreen() {
  const { token } = useAuth()
  const { palette } = useTheme()
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    try {
      const [bookings, shipments, alerts] = await Promise.all([fetchMyBookings(token), fetchMyShipments(token), fetchMyRouteAlerts(token)])
      setSummary(bookings.filter(b => b.status === 'APPROVED').length + ' viajes esperando tu confirmación.\n' +
        shipments.filter(s => ['ASSIGNED', 'PICKED_UP'].includes(s.status)).length + ' envíos en curso.\n' +
        alerts.filter(a => a.notifiedAt).length + ' alertas con una ruta publicada.')
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la actividad') }
  }, [token])
  useFocusEffect(useCallback(() => { void load() }, [load]))
  return <ScreenSafeArea style={{ flex: 1, backgroundColor: palette.colors.background }}>
    <IconButton name="chevron-back" onPress={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ color: palette.colors.text, fontSize: 26 }}>Actividad actual</Text>
      <Text style={{ color: palette.colors.textMuted }}>Resumen recuperado del servidor. El detalle de cada operación conserva su estado.</Text>
      {!summary && !error && <ActivityIndicator />}
      {error && <Text accessibilityRole="alert" style={{ color: palette.colors.danger }}>{error}</Text>}
      {summary && <Text style={{ color: palette.colors.text, lineHeight: 28 }}>{summary}</Text>}
      <Button label="Actualizar" onPress={() => void load()} />
      <Button label="Mis viajes" onPress={() => router.push('/(app)/my-trips')} />
      <Button label="Mis envíos" onPress={() => router.push('/(app)/history')} />
      <Button label="Ver mis alertas en Inicio" onPress={() => router.push('/(app)')} />
    </ScrollView>
  </ScreenSafeArea>
}
