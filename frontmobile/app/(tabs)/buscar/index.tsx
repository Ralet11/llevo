import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TripCard } from '../../../components/TripCard'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Icon } from '../../../components/ui/Icon'
import { Input } from '../../../components/ui/Input'
import { Reveal } from '../../../components/ui/Reveal'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { theme } from '../../../theme'
import { MOCK_TRIPS } from '../../../lib/mockData'

type Mode = 'passenger' | 'package'

const QUICK_ROUTES = [
  { origin: 'Mercedes', destination: 'Buenos Aires' },
  { origin: 'Luján', destination: 'Buenos Aires' },
  { origin: 'Chacabuco', destination: 'Buenos Aires' },
]

export default function BuscarScreen() {
  const params = useLocalSearchParams<{ origin?: string; dest?: string; mode?: string }>()
  const [mode, setMode] = useState<Mode>('passenger')
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (typeof params.origin === 'string') setOrigin(params.origin)
    if (typeof params.dest === 'string') setDest(params.dest)
    if (params.mode === 'package' || params.mode === 'passenger') setMode(params.mode)
    if (params.origin || params.dest || params.mode) setSearched(true)
  }, [params.dest, params.mode, params.origin])

  const filtered = MOCK_TRIPS.filter((trip) => {
    if (trip.status !== 'OPEN') return false
    if (mode === 'passenger' && trip.availableSeats <= 0) return false
    if (mode === 'package' && trip.availableKg <= 0) return false

    const matchesOrigin = !origin || trip.originCity.toLowerCase().includes(origin.toLowerCase())
    const matchesDestination = !dest || trip.destinationCity.toLowerCase().includes(dest.toLowerCase())
    return matchesOrigin && matchesDestination
  })

  function runQuickRoute(routeOrigin: string, routeDestination: string) {
    setOrigin(routeOrigin)
    setDest(routeDestination)
    setSearched(true)
  }

  const sectionTitle = searched ? 'Resultados para tu búsqueda' : 'Viajes destacados'
  const resultLabel =
    mode === 'passenger'
      ? `${filtered.length} viajes con asientos disponibles`
      : `${filtered.length} viajes con espacio de carga`

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.glowA} />
            <View style={styles.glowB} />
            <Reveal delay={30}>
              <Text style={styles.eyebrow}>Explorá rutas activas</Text>
              <Text style={styles.title}>Buscá viajes, asientos o espacio para tus envíos.</Text>
              <Text style={styles.subtitle}>
                Filtrá por origen y destino para encontrar conductores que ya van hacia donde necesitás.
              </Text>

              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'passenger' && styles.toggleActive]}
                  onPress={() => setMode('passenger')}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel="Buscar pasajeros"
                  accessibilityState={{ selected: mode === 'passenger' }}
                >
                  <Icon
                    name="users"
                    size={16}
                    color={mode === 'passenger' ? theme.colors.icon.brand : theme.colors.icon.inverse}
                  />
                  <Text style={[styles.toggleText, mode === 'passenger' && styles.toggleTextActive]}>
                    Pasajeros
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'package' && styles.toggleActive]}
                  onPress={() => setMode('package')}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel="Buscar paquetes"
                  accessibilityState={{ selected: mode === 'package' }}
                >
                  <Icon
                    name="package"
                    size={16}
                    color={mode === 'package' ? theme.colors.icon.brand : theme.colors.icon.inverse}
                  />
                  <Text style={[styles.toggleText, mode === 'package' && styles.toggleTextActive]}>
                    Paquetes
                  </Text>
                </TouchableOpacity>
              </View>
            </Reveal>
          </View>

          <Reveal delay={100}>
            <Card style={styles.searchCard} elevated="md">
              <Input
                label="Ciudad de origen"
                value={origin}
                onChangeText={setOrigin}
                placeholder="Ej: Mercedes"
                leadingIcon="map-pin"
              />
              <Input
                label="Ciudad de destino"
                value={dest}
                onChangeText={setDest}
                placeholder="Ej: Buenos Aires"
                leadingIcon="navigation"
              />

              <View style={styles.quickRoutes}>
                {QUICK_ROUTES.map((route) => (
                  <TouchableOpacity
                    key={`${route.origin}-${route.destination}`}
                    style={styles.quickRouteChip}
                    activeOpacity={0.85}
                    onPress={() => runQuickRoute(route.origin, route.destination)}
                    accessibilityRole="button"
                    accessibilityLabel={`Usar ruta ${route.origin} a ${route.destination}`}
                  >
                    <Text style={styles.quickRouteText}>
                      {route.origin} → {route.destination}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                label={mode === 'passenger' ? 'Buscar viajes' : 'Buscar envíos'}
                onPress={() => setSearched(true)}
                variant="secondary"
                leftIcon="search"
              />
            </Card>
          </Reveal>

          {mode === 'package' ? (
            <Reveal delay={150}>
              <Card style={styles.alertCard}>
                <View style={styles.alertIconWrap}>
                  <Icon name="bell" size={18} color={theme.colors.icon.brand} />
                </View>
                <View style={styles.alertCopy}>
                  <Text style={styles.alertTitle}>¿No aparece tu ruta?</Text>
                  <Text style={styles.alertDescription}>
                    Configurá una alerta y te avisamos cuando haya un viaje con capacidad de carga.
                  </Text>
                </View>
                <Button label="Crear alerta" onPress={() => setSearched(true)} variant="outline" fullWidth={false} />
              </Card>
            </Reveal>
          ) : null}

          <Reveal delay={190}>
            <View style={styles.resultsSection}>
              <SectionHeader title={sectionTitle} />
              <Text style={styles.resultsCount}>{resultLabel}</Text>

              {filtered.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No encontramos coincidencias"
                  description="Probá otra combinación de ciudades o guardá una alerta para esta ruta."
                  actionLabel="Crear alerta"
                  onActionPress={() => setSearched(true)}
                />
              ) : (
                <View style={styles.resultsList}>
                  {filtered.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onPress={() => router.push(`/trip/${trip.id}`)} />
                  ))}
                </View>
              )}
            </View>
          </Reveal>
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
    gap: theme.spacing.xl,
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
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.12)',
  },
  glowB: {
    position: 'absolute',
    bottom: -80,
    left: -80,
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleActive: {
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
  searchCard: {
    marginHorizontal: theme.spacing.xl,
    marginTop: -24,
    gap: theme.spacing.md,
  },
  quickRoutes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickRouteChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.brandSoft,
  },
  quickRouteText: {
    ...theme.textStyles.caption,
    color: theme.colors.text.brand,
  },
  alertCard: {
    marginHorizontal: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  alertIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
  },
  alertCopy: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
  },
  alertDescription: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  resultsSection: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  resultsCount: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  resultsList: {
    marginTop: theme.spacing.md,
  },
})
