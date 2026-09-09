import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { themedStyles } from '../../lib/theme'
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
        <View style={styles.progressHeader}>
          <Text style={styles.step}>Paso 1 de 5</Text>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map(index => (
              <View key={index} style={[styles.progressSegment, index === 0 && styles.progressSegmentActive]} />
            ))}
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.title}>Elegí cómo querés{`\n`}operar dentro de{`\n`}LLEVO.</Text>
          <Text style={styles.description}>
            Primero definimos tu servicio principal.{`\n`}Después te pedimos los datos mínimos y{`\n`}te llevamos a un home propio.
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
                    size={23}
                    color={isActive ? '#8BEAFF' : Theme.colors.lime}
                  />
                </View>

                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{meta.label}</Text>
                  <Text style={styles.optionText}>{meta.subtitle}</Text>
                </View>

                <View style={[styles.optionSelector, isActive && styles.optionSelectorActive]}>
                  {isActive && <Ionicons name="checkmark" size={16} color="#06243B" />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!selectedMode}
          onPress={handleContinue}
          style={[styles.cta, !selectedMode && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>Continuar onboarding</Text>
          <Ionicons name="arrow-forward" size={19} color="#071422" />
        </TouchableOpacity>
      </ScrollView>
    </ScreenSafeArea>
  )
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071422',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  progressHeader: {
    flex: 1,
    alignItems: 'center',
    gap: 9,
  },
  headerSpacer: { width: 44 },
  step: {
    color: '#6AA4FF',
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSegment: {
    width: 31,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#213A5B',
  },
  progressSegmentActive: { backgroundColor: '#65D5FF' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 28,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -100,
    top: -115,
    backgroundColor: 'rgba(23, 127, 201, 0.22)',
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 29,
    lineHeight: 31,
  },
  description: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 13,
  },
  optionList: {
    gap: 10,
    marginTop: 25,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 84,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#10243A',
    borderWidth: 1,
    borderColor: '#284664',
  },
  optionCardActive: {
    backgroundColor: 'rgba(26, 111, 118, 0.28)',
    borderColor: '#58E7E2',
    borderWidth: 2,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1A2C',
    borderWidth: 1,
    borderColor: '#294968',
  },
  optionIconActive: {
    backgroundColor: 'rgba(64, 220, 212, 0.2)',
    borderColor: '#38BFB9',
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  optionText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  optionSelector: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  optionSelectorActive: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#6CE7F4',
    backgroundColor: '#6CE7F4',
  },
  cta: {
    height: 54,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: '#4D8EFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#071422', fontFamily: Theme.fonts.bold, fontSize: 14 },
}))
