import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import type { DriverMode } from '../../lib/auth'
import { useAuth } from '../../lib/auth'
import { DRIVER_MODE_OPTIONS, getDriverModeMeta } from '../../lib/driver'

export default function DriverModeEntryScreen() {
  const { driverProfile } = useAuth()
  const [selectedMode, setSelectedMode] = useState<DriverMode | null>(driverProfile?.mode ?? null)

  useEffect(() => {
    if (driverProfile?.onboardingCompleted) {
      router.replace('/driver/home')
    }
  }, [driverProfile])

  function handleContinue() {
    if (!selectedMode) return
    router.push({
      pathname: '/driver/setup',
      params: { mode: selectedMode },
    })
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/(app)')} />
        <View style={styles.headerCopy}>
          <Text style={styles.step}>Paso 1 de 3</Text>
          <Text style={styles.headerTitle}>Modo conductor</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Que vas a hacer</Text>
          <Text style={styles.title}>Elegi como queres operar dentro de LLEVO.</Text>
          <Text style={styles.description}>
            Primero definimos tu servicio principal. Despues te pedimos los datos minimos y te llevamos a un home propio.
          </Text>
        </View>

        <View style={styles.optionList}>
          {DRIVER_MODE_OPTIONS.map(mode => {
            const meta = getDriverModeMeta(mode)
            const isActive = selectedMode === mode

            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.88}
                style={[styles.optionCard, isActive && styles.optionCardActive]}
                onPress={() => setSelectedMode(mode)}
              >
                <View style={[styles.optionIcon, isActive && styles.optionIconActive]}>
                  <Ionicons
                    name={meta.icon}
                    size={20}
                    color={isActive ? Theme.colors.black : Theme.colors.lime}
                  />
                </View>

                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{meta.label}</Text>
                  <Text style={styles.optionText}>{meta.subtitle}</Text>
                </View>

                <View style={[styles.optionSelector, isActive && styles.optionSelectorActive]}>
                  {isActive && <Ionicons name="checkmark" size={16} color={Theme.colors.black} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <Button
          label="Continuar onboarding"
          onPress={handleContinue}
          disabled={!selectedMode}
          style={styles.cta}
        />
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
  eyebrow: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 28,
    lineHeight: 32,
    marginTop: 12,
  },
  description: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  optionList: {
    gap: 12,
    marginTop: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  optionCardActive: {
    backgroundColor: '#243010',
    borderColor: Theme.colors.lime,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.backgroundDeep,
  },
  optionIconActive: {
    backgroundColor: Theme.colors.lime,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
  },
  optionText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  optionSelector: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  optionSelectorActive: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Theme.colors.lime,
    backgroundColor: Theme.colors.lime,
  },
  cta: {
    marginTop: 22,
  },
})
