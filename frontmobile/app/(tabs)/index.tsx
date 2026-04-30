import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { TripCard } from '../../components/TripCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { Reveal } from '../../components/ui/Reveal'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { theme } from '../../theme'
import { useAuth } from '../../lib/auth'
import { MOCK_TRIPS, MOCK_MY_REQUESTS } from '../../lib/mockData'

const FEATURED_ROUTES = [
  { origin: 'Mercedes', destination: 'Buenos Aires', mode: 'passenger' as const },
  { origin: 'Luján', destination: 'Buenos Aires', mode: 'package' as const },
  { origin: 'Chacabuco', destination: 'Buenos Aires', mode: 'passenger' as const },
]

export default function InicioScreen() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Ramiro'
  const initials = user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? 'RA'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const pendingCount = MOCK_MY_REQUESTS.filter((request) => request.status === 'PENDING').length
  const nextTrip = MOCK_TRIPS[0]
  const totalAvailableKg = MOCK_TRIPS.reduce((total, trip) => total + trip.availableKg, 0)

  function openRoute(origin: string, destination: string, mode: 'passenger' | 'package') {
    router.push({
      pathname: '/(tabs)/buscar',
      params: { origin, dest: destination, mode },
    })
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glowA} />
          <View style={styles.glowB} />

          <Reveal delay={30}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.userName}>{firstName}</Text>
                <Text style={styles.subtitle}>
                  Hoy podés buscar un viaje, coordinar una entrega o publicar tu próxima salida.
                </Text>
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
          </Reveal>

          <Reveal delay={90}>
            <TouchableOpacity
              style={styles.searchCard}
              onPress={() => router.push('/(tabs)/buscar')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Buscar viaje o envío"
              accessibilityHint="Abre la pantalla de búsqueda."
            >
              <View style={styles.searchIconWrap}>
                <Icon name="search" size={18} color={theme.colors.icon.brand} />
              </View>
              <View style={styles.searchCopy}>
                <Text style={styles.searchLabel}>Buscar viaje o envío</Text>
                <Text style={styles.searchPlaceholder}>¿A dónde vas? ¿Qué necesitás mover?</Text>
              </View>
              <Icon name="arrow-right" size={18} color={theme.colors.icon.muted} />
            </TouchableOpacity>
          </Reveal>

          <Reveal delay={130}>
            <View style={styles.routeChips}>
              {FEATURED_ROUTES.map((route) => (
                <TouchableOpacity
                  key={`${route.origin}-${route.destination}-${route.mode}`}
                  style={styles.routeChip}
                  activeOpacity={0.85}
                  onPress={() => openRoute(route.origin, route.destination, route.mode)}
                  accessibilityRole="button"
                  accessibilityLabel={`Buscar ${route.origin} a ${route.destination}`}
                >
                  <Icon
                    name={route.mode === 'passenger' ? 'users' : 'package'}
                    size={14}
                    color={theme.colors.icon.inverse}
                  />
                  <Text style={styles.routeChipText}>
                    {route.origin} · {route.destination}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Reveal>
        </View>

        <Reveal delay={170}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} padded={false}>
              <Text style={styles.statValue}>{MOCK_TRIPS.length}</Text>
              <Text style={styles.statLabel}>rutas activas</Text>
            </Card>
            <Card style={styles.statCard} padded={false}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>solicitudes pendientes</Text>
            </Card>
            <Card style={styles.statCard} padded={false}>
              <Text style={styles.statValue}>{totalAvailableKg} kg</Text>
              <Text style={styles.statLabel}>de carga publicada</Text>
            </Card>
          </View>
        </Reveal>

        <Reveal delay={210}>
          <Card style={styles.nextTripCard} elevated="md">
            <View style={styles.nextTripHeader}>
              <View style={styles.nextTripHeaderCopy}>
                <Text style={styles.nextTripEyebrow}>Próxima salida destacada</Text>
                <Text style={styles.nextTripTitle}>
                  {nextTrip.originCity} a {nextTrip.destinationCity}
                </Text>
              </View>
              <Badge status={nextTrip.status} />
            </View>
            <View style={styles.nextTripMeta}>
              <View style={styles.metaRow}>
                <Icon name="calendar" size={14} color={theme.colors.icon.muted} />
                <Text style={styles.metaText}>
                  {new Date(nextTrip.departureDate).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Icon name="clock" size={14} color={theme.colors.icon.muted} />
                <Text style={styles.metaText}>
                  Sale a las{' '}
                  {new Date(nextTrip.departureDate).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            <Button
              label="Ver detalle del viaje"
              onPress={() => router.push(`/trip/${nextTrip.id}`)}
              variant="outline"
              rightIcon="arrow-right"
            />
          </Card>
        </Reveal>

        <Reveal delay={250}>
          <View style={styles.section}>
            <SectionHeader
              title="Tus solicitudes activas"
              actionLabel="Ver todo"
              onActionPress={() => router.push('/(tabs)/misviajes')}
              actionAccessibilityHint="Abre la lista completa de tus solicitudes activas."
            />
            <View style={styles.sectionList}>
              {MOCK_MY_REQUESTS.map((request) => (
                <TouchableOpacity
                  key={request.id}
                  style={styles.requestTouchable}
                  activeOpacity={0.86}
                  onPress={() => router.push('/(tabs)/misviajes')}
                  accessibilityRole="button"
                  accessibilityLabel={`${request.trip.originCity} a ${request.trip.destinationCity}`}
                >
                  <Card style={styles.requestCard}>
                    <View style={styles.requestTop}>
                      <View style={styles.requestIconWrap}>
                        <Icon
                          name={request.type === 'passenger' ? 'users' : 'package'}
                          size={18}
                          color={theme.colors.icon.brand}
                        />
                      </View>
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestRoute}>
                          {request.trip.originCity} → {request.trip.destinationCity}
                        </Text>
                        <Text style={styles.requestMeta}>
                          {request.type === 'passenger'
                            ? `${request.seats} asiento reservado`
                            : `${request.weightKg} kg coordinados`}
                        </Text>
                      </View>
                      <Badge status={request.status} />
                    </View>
                    <View style={styles.requestFooter}>
                      <Text style={styles.requestDate}>
                        {new Date(request.trip.departureDate).toLocaleDateString('es-AR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                      <Text style={styles.requestDriver}>con {request.trip.driver.name}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Reveal>

        <Reveal delay={290}>
          <View style={styles.section}>
            <SectionHeader
              title="Viajes disponibles"
              actionLabel="Ver todos"
              onActionPress={() => router.push('/(tabs)/buscar')}
              actionAccessibilityHint="Abre la busqueda completa de viajes disponibles."
            />
            <View style={styles.sectionList}>
              {MOCK_TRIPS.slice(0, 3).map((trip) => (
                <TripCard key={trip.id} trip={trip} onPress={() => router.push(`/trip/${trip.id}`)} />
              ))}
            </View>
          </View>
        </Reveal>

        <Reveal delay={330}>
          <Card style={styles.publishCard} elevated="md">
            <View style={styles.publishIconWrap}>
              <Icon name="truck" size={18} color={theme.colors.icon.brand} />
            </View>
            <View style={styles.publishCopy}>
              <Text style={styles.publishTitle}>¿Viajás entre ciudades esta semana?</Text>
              <Text style={styles.publishDescription}>
                Publicá asientos o espacio de carga y convertí una ruta habitual en un ingreso adicional.
              </Text>
            </View>
            <Button
              label="Publicar mi viaje"
              onPress={() => router.push('/(tabs)/publicar')}
              variant="secondary"
              rightIcon="arrow-right"
            />
          </Card>
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  content: {
    paddingBottom: 124,
    gap: theme.spacing.xxl,
  },
  hero: {
    overflow: 'hidden',
    backgroundColor: theme.colors.background.brand,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  glowA: {
    position: 'absolute',
    top: -90,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.14)',
  },
  glowB: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(78, 122, 167, 0.18)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  greeting: {
    ...theme.textStyles.label,
    color: theme.colors.action.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    ...theme.textStyles.h1,
    color: theme.colors.text.inverse,
  },
  subtitle: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.76)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.action.accent,
  },
  avatarText: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.surface,
    ...theme.shadows.md,
  },
  searchIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
  },
  searchCopy: {
    flex: 1,
    gap: 2,
  },
  searchLabel: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
  },
  searchPlaceholder: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
  },
  routeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
  },
  routeChipText: {
    ...theme.textStyles.caption,
    color: theme.colors.text.inverse,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginTop: -22,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  statValue: {
    ...theme.textStyles.title,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  statLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  nextTripCard: {
    marginHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  nextTripHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  nextTripHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  nextTripEyebrow: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nextTripTitle: {
    ...theme.textStyles.h3,
    color: theme.colors.text.primary,
  },
  nextTripMeta: {
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metaText: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  sectionList: {
    gap: theme.spacing.md,
  },
  requestTouchable: {
    borderRadius: theme.radius.lg,
  },
  requestCard: {
    gap: theme.spacing.md,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  requestIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestRoute: {
    ...theme.textStyles.titleSmall,
    color: theme.colors.text.primary,
  },
  requestMeta: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  requestDate: {
    ...theme.textStyles.caption,
    color: theme.colors.text.brand,
  },
  requestDriver: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  publishCard: {
    marginHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background.brand,
    borderColor: theme.colors.border.inverse,
  },
  publishIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.action.accent,
  },
  publishCopy: {
    gap: theme.spacing.sm,
  },
  publishTitle: {
    ...theme.textStyles.h3,
    color: theme.colors.text.inverse,
  },
  publishDescription: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.76)',
  },
})
