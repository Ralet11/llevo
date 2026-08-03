import { Ionicons } from '@expo/vector-icons'
import { useRef, useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Theme } from '../../../constants/theme'
import type { User } from '../../../lib/auth'
import type { MyShipment } from '../../../lib/shipments'
import type { RouteAlert, TravelRequest } from '../../../lib/trips'
import { useTheme } from '../../../lib/theme'
import { Button } from '../../ui/Button'
import { IconButton } from '../../ui/IconButton'
import { ScreenSafeArea } from '../ScreenSafeArea'
import { ActiveShipmentStrip } from './ActiveShipmentStrip'

type LocationStatus = 'loading' | 'device' | 'permission_denied' | 'services_off' | 'error'

type Props = {
  user: User | null
  locationStatus: LocationStatus
  onRequestLocation: () => void
  onOpenDrawer: () => void
  onOpenComposer: () => void
  onOpenTravel: () => void
  onOpenNotifications: () => void
  activeShipment: MyShipment | null
  onResumeTracking: (shipment: MyShipment) => void
  activeTravelRequest: TravelRequest | null
  onOpenTravelRequest: (travelRequest: TravelRequest) => void
  activeRouteAlert?: RouteAlert | null
  routeAlerts?: RouteAlert[]
  onOpenRouteAlert: (alert: RouteAlert) => void
}

function getFirstName(name?: string) {
  if (!name) return ''
  return name.split(' ')[0]
}

const TABS = [
  { key: 'paquete', label: 'Enviar paquete' },
  { key: 'viaje', label: 'Quiero viajar' },
] as const

export function HomeDashboard({
  user,
  locationStatus,
  onRequestLocation,
  onOpenDrawer,
  onOpenComposer,
  onOpenTravel,
  onOpenNotifications,
  activeShipment,
  onResumeTracking,
  activeTravelRequest,
  onOpenTravelRequest,
  activeRouteAlert,
  routeAlerts = [],
  onOpenRouteAlert,
}: Props) {
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const firstName = getFirstName(user?.name)
  const { width } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const [page, setPage] = useState(0)
  const routeAlertLabel = activeRouteAlert
    ? (activeRouteAlert.notifiedAt ? 'Hay un viaje disponible' : 'Seguimos tu ruta')
    : null

  function goToPage(index: number) {
    setPage(index)
    scrollRef.current?.scrollTo({ x: index * width, animated: true })
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    if (next !== page) setPage(next)
  }

  return (
    <ScreenSafeArea style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="menu" onPress={onOpenDrawer} />
        <Text style={styles.greeting} numberOfLines={1}>
          {firstName ? `Hola, ${firstName}` : 'Hola'}
        </Text>
        <IconButton name="notifications-outline" onPress={onOpenNotifications} variant="light" />
      </View>

      {activeShipment && (
        <ActiveShipmentStrip shipment={activeShipment} onPress={() => onResumeTracking(activeShipment)} />
      )}

      {locationStatus !== 'device' && (
        <TouchableOpacity activeOpacity={0.85} style={styles.locationBanner} onPress={onRequestLocation}>
          <Ionicons name="location-outline" size={16} color={colors.warning} />
          <Text style={styles.locationBannerText} numberOfLines={1}>
            {locationStatus === 'permission_denied'
              ? 'Falta habilitar tu ubicacion. Toca para activarla.'
              : 'No pudimos ubicarte. Toca para reintentar.'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Selector: se puede tocar o deslizar entre las dos experiencias */}
      <View style={styles.segment}>
        {TABS.map((tab, i) => {
          const active = page === i
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.segmentTab, active && styles.segmentTabActive]}
              activeOpacity={0.85}
              onPress={() => goToPage(i)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {/* Página 1: enviar paquete */}
        <View style={[styles.page, { width }]}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="cube" size={40} color={colors.lime} />
          </View>
          <Text style={styles.heroTitle}>Enviar un paquete</Text>
          <Text style={styles.heroSubtitle}>Coordina el retiro y la entrega en minutos.</Text>
          <Button label="Enviar ahora" onPress={onOpenComposer} style={styles.heroButton} />
        </View>

        {/* Página 2: quiero viajar */}
        <View style={[styles.page, { width }]}>
          {routeAlerts.length > 0 ? (
            <ScrollView style={styles.routeAlertScroll} contentContainerStyle={styles.routeAlertList} showsVerticalScrollIndicator={false}>
              <Text style={styles.routeAlertListTitle}>Seguimientos de ruta</Text>
              {routeAlerts.map(alert => (
                <TouchableOpacity key={alert.id} style={styles.travelRequestCard} activeOpacity={0.85} onPress={() => onOpenRouteAlert(alert)}>
                  <View style={styles.travelRequestTop}>
                    <View style={styles.travelRequestIcon}><Ionicons name={alert.notifiedAt ? 'car-sport' : 'notifications-outline'} size={20} color={colors.lime} /></View>
                    <View style={styles.travelRequestCopy}>
                      <Text style={styles.travelRequestLabel}>{alert.notifiedAt ? 'Hay un viaje disponible' : 'Seguimos tu ruta'}</Text>
                      <Text style={styles.travelRequestRoute}>{alert.originCity} → {alert.destinationCity}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                  <Text style={styles.travelRequestDate}>{new Date(`${alert.date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                  <Text style={styles.travelRequestHint}>{alert.notifiedAt ? 'Tocá para buscar el viaje disponible.' : 'Te avisamos cuando se publique una ruta compatible.'}</Text>
                </TouchableOpacity>
              ))}
              <Button label="Buscar otro viaje" onPress={onOpenTravel} style={styles.routeAlertSearchButton} />
            </ScrollView>
          ) : activeTravelRequest ? (
            <TouchableOpacity style={styles.travelRequestCard} activeOpacity={0.85} onPress={() => onOpenTravelRequest(activeTravelRequest)}>
              <View style={styles.travelRequestTop}>
                <View style={styles.travelRequestIcon}><Ionicons name={activeTravelRequest.status === 'PUBLISHED' ? 'megaphone-outline' : 'search'} size={20} color={colors.lime} /></View>
                <View style={styles.travelRequestCopy}>
                  <Text style={styles.travelRequestLabel}>{routeAlertLabel ?? (activeTravelRequest.status === 'PUBLISHED' ? 'Viaje publicado' : 'Buscando tu viaje')}</Text>
                  <Text style={styles.travelRequestRoute}>{activeTravelRequest.originCity} → {activeTravelRequest.destinationCity}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.travelRequestDate}>{new Date(`${activeTravelRequest.date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              <Text style={styles.travelRequestHint}>{routeAlertLabel ? (activeRouteAlert?.notifiedAt ? 'Tocá para buscar el viaje disponible.' : 'Te avisamos cuando se publique una ruta compatible.') : (activeTravelRequest.status === 'PUBLISHED' ? 'Los conductores compatibles pueden verlo y sumarse.' : 'Ya avisamos a conductores que recorren este trayecto.')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.heroIconWrap}>
                <Ionicons name="car-sport" size={40} color={colors.lime} />
              </View>
              <Text style={styles.heroTitle}>Quiero viajar</Text>
              <Text style={styles.heroSubtitle}>Sumate a un viaje de un punto a otro y compartí el camino.</Text>
              <Button label="Buscar un viaje" onPress={onOpenTravel} style={styles.heroButton} />
            </>
          )}
        </View>
      </ScrollView>
    </ScreenSafeArea>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    flex: 1,
    marginHorizontal: 12,
    color: colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 20,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.pill,
    backgroundColor: colors.surface,
  },
  locationBannerText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: colors.lime,
  },
  segmentText: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
  segmentTextActive: {
    color: colors.black,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  routeAlertScroll: { alignSelf: 'stretch', flex: 1 },
  routeAlertList: { paddingVertical: 12, gap: 12 },
  routeAlertListTitle: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 22, marginBottom: 2 },
  routeAlertSearchButton: { marginTop: 4 },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 24,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  heroButton: {
    width: '100%',
  },
  travelRequestCard: { width: '100%', padding: 18, borderRadius: 20, gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  travelRequestTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  travelRequestIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  travelRequestCopy: { flex: 1 },
  travelRequestLabel: { color: colors.lime, fontFamily: Theme.fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  travelRequestRoute: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16, marginTop: 2 },
  travelRequestDate: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, textTransform: 'capitalize' },
  travelRequestHint: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 18 },
})
