import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { cancelRouteAlert } from '../../lib/trips'

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value?: string) {
  if (!value) return 'Fecha a confirmar'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Fecha a confirmar'
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function RouteAlertScreen() {
  const { token } = useAuth()
  const { palette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)
  const params = useLocalSearchParams<{ id?: string; origin?: string; destination?: string; date?: string; notifiedAt?: string }>()
  const origin = first(params.origin) ?? ''
  const destination = first(params.destination) ?? ''
  const date = first(params.date)
  const hasAvailableTrip = Boolean(first(params.notifiedAt))
  const [cancelling, setCancelling] = useState(false)

  function searchRoute() {
    router.push({
      pathname: '/(app)/travel',
      params: { origin, destination, date },
    })
  }

  function confirmStopFollowing() {
    const id = first(params.id)
    if (!id || !token || cancelling) return
    Alert.alert('Dejar de seguir esta ruta', 'Ya no te avisaremos sobre viajes para esta fecha y recorrido.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Dejar de seguir', style: 'destructive', onPress: () => {
          void (async () => {
            setCancelling(true)
            try {
              await cancelRouteAlert(token, id)
              router.replace('/(app)')
            } catch (err) {
              Alert.alert('No se pudo eliminar', err instanceof Error ? err.message : 'Intentá de nuevo.')
            } finally {
              setCancelling(false)
            }
          })()
        },
      },
    ])
  }

  return (
    <ScreenSafeArea style={s.container}>
      <View style={s.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View>
          <Text style={s.headerLabel}>Quiero viajar</Text>
          <Text style={s.headerTitle}>Detalle del seguimiento</Text>
        </View>
      </View>

      <View style={s.content}>
        <View style={s.statusIcon}>
          <Ionicons name={hasAvailableTrip ? 'car-sport' : 'notifications-outline'} size={36} color={colors.lime} />
        </View>
        <Text style={s.statusTitle}>{hasAvailableTrip ? 'Hay un viaje para revisar' : 'Seguimos esta ruta'}</Text>
        <Text style={s.statusText}>
          {hasAvailableTrip
            ? 'Se publicó una ruta compatible. Revisá los viajes disponibles para solicitar tu lugar.'
            : 'Te vamos a avisar cuando se publique un viaje compatible con esta ruta.'}
        </Text>

        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={s.routeDot} />
            <View style={s.routeLine} />
            <Ionicons name="location" size={17} color={colors.lime} />
          </View>
          <View style={s.routeCopy}>
            <Text style={s.cityLabel}>DESDE</Text>
            <Text style={s.cityName}>{origin || 'Ciudad de origen'}</Text>
            <View style={s.routeDivider} />
            <Text style={s.cityLabel}>HASTA</Text>
            <Text style={s.cityName}>{destination || 'Ciudad de destino'}</Text>
          </View>
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={s.dateText}>{formatDate(date)}</Text>
          </View>
        </View>

        {hasAvailableTrip ? (
          <Button label="Ver viajes disponibles" onPress={searchRoute} style={s.primaryButton} />
        ) : (
          <TouchableOpacity activeOpacity={0.8} onPress={searchRoute} style={s.searchLink}>
            <Ionicons name="search-outline" size={18} color={colors.lime} />
            <Text style={s.searchLinkText}>Buscar viajes ahora</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity activeOpacity={0.8} disabled={cancelling} onPress={confirmStopFollowing} style={s.stopLink}>
          <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
          <Text style={s.stopLinkText}>{cancelling ? 'Eliminando seguimiento...' : 'Dejar de seguir esta ruta'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenSafeArea>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 13 },
  headerLabel: { color: colors.textSubtle, fontFamily: Theme.fonts.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: .7 },
  headerTitle: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 20, marginTop: 2 },
  content: { flex: 1, paddingTop: 36, alignItems: 'center' },
  statusIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  statusTitle: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 25, textAlign: 'center' },
  statusText: { color: colors.textMuted, fontFamily: Theme.fonts.body, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 315 },
  routeCard: { alignSelf: 'stretch', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, marginTop: 32 },
  routeRow: { position: 'absolute', left: 22, top: 32, alignItems: 'center', height: 57 },
  routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.lime },
  routeLine: { flex: 1, width: 1, backgroundColor: colors.border, marginVertical: 4 },
  routeCopy: { marginLeft: 25 },
  cityLabel: { color: colors.textSubtle, fontFamily: Theme.fonts.medium, fontSize: 10, letterSpacing: .7 },
  cityName: { color: colors.text, fontFamily: Theme.fonts.medium, fontSize: 16, marginTop: 3 },
  routeDivider: { height: 18 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 18, paddingTop: 14 },
  dateText: { color: colors.textMuted, fontFamily: Theme.fonts.body, fontSize: 14, textTransform: 'capitalize' },
  primaryButton: { alignSelf: 'stretch', marginTop: 22 },
  searchLink: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  searchLinkText: { color: colors.lime, fontFamily: Theme.fonts.medium, fontSize: 15 },
  stopLink: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  stopLinkText: { color: colors.danger, fontFamily: Theme.fonts.medium, fontSize: 15 },
})
