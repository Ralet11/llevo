import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { TripCard } from '../../../components/TripCard'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Icon } from '../../../components/ui/Icon'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { theme } from '../../../theme'
import { MOCK_MY_REQUESTS, MOCK_MY_TRIPS } from '../../../lib/mockData'

type Tab = 'driver' | 'requests'

export default function MisViajesScreen() {
  const [tab, setTab] = useState<Tab>('driver')

  const acceptedRequests = MOCK_MY_REQUESTS.filter((item) => item.status === 'ACCEPTED').length
  const pendingRequests = MOCK_MY_REQUESTS.filter((item) => item.status === 'PENDING').length
  const nextOwnTrip = MOCK_MY_TRIPS[0]

  const headerStats = useMemo(() => {
    return [
      { label: 'viajes publicados', value: String(MOCK_MY_TRIPS.length) },
      { label: 'solicitudes activas', value: String(MOCK_MY_REQUESTS.length) },
      { label: 'confirmadas', value: String(acceptedRequests) },
    ]
  }, [acceptedRequests])

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.glowA} />
            <View style={styles.glowB} />
            <Text style={styles.eyebrow}>Gestión operativa</Text>
            <Text style={styles.title}>Seguí tus salidas y cada solicitud desde un solo lugar.</Text>
            <Text style={styles.subtitle}>
              Controlá qué publicaste, qué aceptaste y qué sigue pendiente antes del próximo viaje.
            </Text>

            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, tab === 'driver' && styles.toggleBtnActive]}
                activeOpacity={0.86}
                onPress={() => setTab('driver')}
                accessibilityRole="button"
                accessibilityLabel="Ver viajes publicados"
                accessibilityHint="Muestra tus salidas publicadas."
                accessibilityState={{ selected: tab === 'driver' }}
              >
                <Icon
                  name="truck"
                  size={16}
                  color={tab === 'driver' ? theme.colors.icon.brand : theme.colors.icon.inverse}
                />
                <Text style={[styles.toggleText, tab === 'driver' && styles.toggleTextActive]}>Publicados</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, tab === 'requests' && styles.toggleBtnActive]}
                activeOpacity={0.86}
                onPress={() => setTab('requests')}
                accessibilityRole="button"
                accessibilityLabel="Ver solicitudes activas"
                accessibilityHint="Muestra tus solicitudes en curso."
                accessibilityState={{ selected: tab === 'requests' }}
              >
                <Icon
                  name="inbox"
                  size={16}
                  color={tab === 'requests' ? theme.colors.icon.brand : theme.colors.icon.inverse}
                />
                <Text style={[styles.toggleText, tab === 'requests' && styles.toggleTextActive]}>Solicitudes</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            {headerStats.map((item) => (
              <Card key={item.label} style={styles.statCard} padded={false}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>

          {tab === 'driver' ? (
            <>
              {nextOwnTrip ? (
                <Card style={styles.featureCard} elevated="md">
                  <View style={styles.featureHeader}>
                    <View style={styles.featureCopy}>
                      <Text style={styles.featureEyebrow}>Próxima salida propia</Text>
                      <Text style={styles.featureTitle}>
                        {nextOwnTrip.originCity} → {nextOwnTrip.destinationCity}
                      </Text>
                    </View>
                    <Badge status={nextOwnTrip.status} />
                  </View>
                  <Text style={styles.featureMeta}>
                    {new Date(nextOwnTrip.departureDate).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                  <Button
                    label="Ver detalle"
                    onPress={() => router.push(`/trip/${nextOwnTrip.id}`)}
                    variant="outline"
                    rightIcon="arrow-right"
                  />
                </Card>
              ) : null}

              <View style={styles.section}>
                <SectionHeader title="Tus viajes publicados" />
                {MOCK_MY_TRIPS.length === 0 ? (
                  <EmptyState
                    icon="truck"
                    title="Todavía no publicaste viajes"
                    description="Publicá una salida para empezar a recibir solicitudes de pasajeros o paquetes."
                    actionLabel="Publicar mi primer viaje"
                    onActionPress={() => router.push('/(tabs)/publicar')}
                  />
                ) : (
                  <View style={styles.list}>
                    {MOCK_MY_TRIPS.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onPress={() => router.push(`/trip/${trip.id}`)}
                        showStatus
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              <Card style={styles.featureCard} elevated="md">
                <View style={styles.requestStatsRow}>
                  <View style={styles.requestStatBox}>
                    <Text style={styles.requestStatValue}>{pendingRequests}</Text>
                    <Text style={styles.requestStatLabel}>pendientes</Text>
                  </View>
                  <View style={styles.requestStatBox}>
                    <Text style={styles.requestStatValue}>{acceptedRequests}</Text>
                    <Text style={styles.requestStatLabel}>confirmadas</Text>
                  </View>
                </View>
                <Text style={styles.featureMeta}>
                  Revisá cada solicitud antes de la salida y confirmá la que ya quedó coordinada.
                </Text>
              </Card>

              <View style={styles.section}>
                <SectionHeader title="Solicitudes en curso" />
                {MOCK_MY_REQUESTS.length === 0 ? (
                  <EmptyState
                    icon="search"
                    title="No tenés solicitudes activas"
                    description="Buscá un viaje y enviá tu primera solicitud para reservar un asiento o una entrega."
                    actionLabel="Buscar viajes"
                    onActionPress={() => router.push('/(tabs)/buscar')}
                  />
                ) : (
                  <View style={styles.list}>
                    {MOCK_MY_REQUESTS.map((request) => {
                      const trip = request.trip
                      const total =
                        request.type === 'passenger'
                          ? trip.pricePerSeat * (request.seats ?? 1)
                          : trip.pricePerKg * (request.weightKg ?? 0)

                      return (
                        <Card key={request.id} style={styles.requestCard}>
                          <View style={styles.requestTop}>
                            <View style={styles.requestIconWrap}>
                              <Icon
                                name={request.type === 'passenger' ? 'users' : 'package'}
                                size={18}
                                color={theme.colors.icon.brand}
                              />
                            </View>
                            <View style={styles.requestCopy}>
                              <Text style={styles.requestRoute}>
                                {trip.originCity} → {trip.destinationCity}
                              </Text>
                              <Text style={styles.requestMeta}>
                                {new Date(trip.departureDate).toLocaleDateString('es-AR', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}{' '}
                                · con {trip.driver.name}
                              </Text>
                            </View>
                            <Badge status={request.status} />
                          </View>

                          <View style={styles.requestDetails}>
                            <Text style={styles.requestDetailTitle}>
                              {request.type === 'passenger'
                                ? `${request.seats} asiento reservado`
                                : `${request.weightKg} kg para enviar`}
                            </Text>
                            <Text style={styles.requestDetailValue}>${total.toLocaleString()}</Text>
                          </View>

                          {request.message ? (
                            <View style={styles.requestMessage}>
                              <Icon name="message-circle" size={14} color={theme.colors.icon.secondary} />
                              <Text style={styles.requestMessageText}>{request.message}</Text>
                            </View>
                          ) : null}

                          {request.status === 'ACCEPTED' ? (
                            <View style={styles.confirmedBanner}>
                              <Icon name="check-circle" size={16} color={theme.colors.icon.success} />
                              <Text style={styles.confirmedText}>
                                Viaje confirmado. El pago se libera cuando la operación termina correctamente.
                              </Text>
                            </View>
                          ) : null}
                        </Card>
                      )
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 124,
  },
  hero: {
    overflow: 'hidden',
    backgroundColor: theme.colors.background.brand,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  glowA: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.14)',
  },
  glowB: {
    position: 'absolute',
    bottom: -80,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(78, 122, 167, 0.18)',
  },
  eyebrow: {
    ...theme.textStyles.label,
    color: theme.colors.action.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...theme.textStyles.h1,
    color: theme.colors.text.inverse,
  },
  subtitle: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.74)',
  },
  toggle: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.background.surface,
  },
  toggleText: {
    ...theme.textStyles.label,
    color: theme.colors.text.inverse,
  },
  toggleTextActive: {
    color: theme.colors.text.brand,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginTop: -24,
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
  },
  statLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  featureCard: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  featureCopy: {
    flex: 1,
    gap: 4,
  },
  featureEyebrow: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  featureTitle: {
    ...theme.textStyles.h3,
    color: theme.colors.text.primary,
  },
  featureMeta: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
  },
  requestStatsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  requestStatBox: {
    flex: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.app,
    padding: theme.spacing.lg,
  },
  requestStatValue: {
    ...theme.textStyles.h3,
    color: theme.colors.text.primary,
  },
  requestStatLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  list: {
    gap: theme.spacing.md,
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
  requestCopy: {
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
  requestDetails: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.app,
    padding: theme.spacing.lg,
    gap: 4,
  },
  requestDetailTitle: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
  },
  requestDetailValue: {
    ...theme.textStyles.title,
    color: theme.colors.text.brand,
  },
  requestMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  requestMessageText: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.successSoft,
    padding: theme.spacing.lg,
  },
  confirmedText: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
})
