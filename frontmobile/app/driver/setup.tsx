import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Theme } from '../../constants/theme'
import type { DriverMode } from '../../lib/auth'
import { useAuth } from '../../lib/auth'
import { getDriverModeMeta } from '../../lib/driver'

function parseDriverMode(value: string | string[] | undefined): DriverMode | null {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (rawValue === 'rider' || rawValue === 'viajes' || rawValue === 'entrega') {
    return rawValue
  }
  return null
}

export default function DriverSetupScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string | string[] }>()
  const { user, driverProfile, saveDriverProfile } = useAuth()
  const mode = useMemo(() => parseDriverMode(modeParam), [modeParam])
  const currentProfile = mode && driverProfile?.mode === mode ? driverProfile : null
  const [city, setCity] = useState(currentProfile?.city ?? user?.city ?? '')
  const [vehicle, setVehicle] = useState(currentProfile?.vehicle ?? '')
  const [coverage, setCoverage] = useState(currentProfile?.coverage ?? '')
  const [availability, setAvailability] = useState(currentProfile?.availability ?? '')
  const [notes, setNotes] = useState(currentProfile?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!mode) {
      router.replace('/driver')
    }
  }, [mode])

  if (!mode) return null

  const meta = getDriverModeMeta(mode)

  async function handleSubmit() {
    if (!mode) return

    if (!city.trim()) {
      setError('Completa tu ciudad base.')
      return
    }

    if (!vehicle.trim()) {
      setError(`Completa ${meta.vehicleLabel.toLowerCase()}.`)
      return
    }

    if (!coverage.trim()) {
      setError(`Completa ${meta.coverageLabel.toLowerCase()}.`)
      return
    }

    if (!availability.trim()) {
      setError(`Completa ${meta.availabilityLabel.toLowerCase()}.`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await saveDriverProfile({
        mode,
        city,
        vehicle,
        coverage,
        availability,
        notes,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
      })
      router.replace('/driver/home')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/driver')} />
        <View style={styles.headerCopy}>
          <Text style={styles.step}>Paso 2 de 3</Text>
          <Text style={styles.headerTitle}>Configurar onboarding</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name={meta.icon} size={18} color={Theme.colors.black} />
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
          <Text style={styles.title}>{meta.setupTitle}</Text>
          <Text style={styles.description}>{meta.setupDescription}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Ciudad base"
            value={city}
            onChangeText={setCity}
            placeholder="Buenos Aires"
            autoCapitalize="words"
          />
          <Input
            label={meta.vehicleLabel}
            value={vehicle}
            onChangeText={setVehicle}
            placeholder={meta.vehiclePlaceholder}
            autoCapitalize="sentences"
          />
          <Input
            label={meta.coverageLabel}
            value={coverage}
            onChangeText={setCoverage}
            placeholder={meta.coveragePlaceholder}
            autoCapitalize="sentences"
          />
          <Input
            label={meta.availabilityLabel}
            value={availability}
            onChangeText={setAvailability}
            placeholder={meta.availabilityPlaceholder}
            autoCapitalize="sentences"
          />
          <Input
            label="Notas opcionales"
            value={notes}
            onChangeText={setNotes}
            placeholder="Algo que quieras aclarar sobre tu operacion"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button label="Ir al home conductor" onPress={() => void handleSubmit()} loading={saving} />
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
  badge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.lime,
  },
  badgeText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 27,
    lineHeight: 31,
    marginTop: 14,
  },
  description: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  form: {
    marginTop: 20,
  },
  notesInput: {
    minHeight: 108,
    paddingTop: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: Theme.colors.dangerSurface,
  },
  errorText: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
  },
})
