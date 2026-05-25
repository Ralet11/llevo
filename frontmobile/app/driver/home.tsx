import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { getDriverModeMeta } from '../../lib/driver'

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  value: string
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={16} color={Theme.colors.lime} />
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  )
}

export default function DriverHomeScreen() {
  const { driverProfile, clearDriverProfile } = useAuth()

  useEffect(() => {
    if (!driverProfile?.onboardingCompleted) {
      router.replace('/driver')
    }
  }, [driverProfile])

  if (!driverProfile?.onboardingCompleted) return null

  const meta = getDriverModeMeta(driverProfile.mode)

  async function handleReset() {
    await clearDriverProfile()
    router.replace('/driver')
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/(app)')} />
        <View style={styles.headerCopy}>
          <Text style={styles.step}>Paso 3 de 3</Text>
          <Text style={styles.headerTitle}>Home conductor</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name={meta.icon} size={18} color={Theme.colors.black} />
            <Text style={styles.heroBadgeText}>{meta.label}</Text>
          </View>
          <Text style={styles.heroTitle}>Tu modo conductor ya quedo activo.</Text>
          <Text style={styles.heroText}>
            Este es el home base para seguir armando el flujo conductor. Por ahora guardamos tu configuracion y te dejamos una vista resumida.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard icon="business-outline" label="Ciudad base" value={driverProfile.city} />
          <SummaryCard icon="car-outline" label={meta.vehicleLabel} value={driverProfile.vehicle} />
          <SummaryCard icon="map-outline" label={meta.coverageLabel} value={driverProfile.coverage} />
          <SummaryCard icon="time-outline" label={meta.availabilityLabel} value={driverProfile.availability} />
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Siguiente paso</Text>
          <Text style={styles.placeholderText}>
            Aca podemos sumar dashboard, viajes activos, pedidos y herramientas segun el tipo de conductor.
          </Text>
          {driverProfile.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notas guardadas</Text>
              <Text style={styles.notesText}>{driverProfile.notes}</Text>
            </View>
          ) : null}
        </View>

        <Button
          label="Editar onboarding"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/driver/setup',
              params: { mode: driverProfile.mode },
            })
          }
        />

        <TouchableOpacity activeOpacity={0.82} style={styles.resetButton} onPress={() => void handleReset()}>
          <Ionicons name="refresh" size={16} color={Theme.colors.textMuted} />
          <Text style={styles.resetText}>Cambiar actividad</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenSafeArea>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  headerCopy: {
    flex: 1,
  },
  step: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.lime,
  },
  heroBadgeText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  heroTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 27,
    lineHeight: 31,
    marginTop: 14,
  },
  heroText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  summaryGrid: {
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryLabel: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  placeholder: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: '#1D2710',
    borderWidth: 1,
    borderColor: '#435D16',
  },
  placeholderTitle: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  placeholderText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  notesBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  notesLabel: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  notesText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  resetButton: {
    minHeight: 46,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
})
