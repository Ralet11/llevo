import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'

function statusLabel(status?: string) {
  switch (status) {
    case 'APPROVED':
      return 'Aprobada'
    case 'IN_REVIEW':
      return 'En revision'
    case 'DECLINED':
      return 'Rechazada'
    case 'RESUBMITTED':
      return 'Repetir pasos'
    case 'EXPIRED':
      return 'Vencida'
    case 'ABANDONED':
      return 'Incompleta'
    case 'KYC_EXPIRED':
      return 'Vencida por KYC'
    case 'IN_PROGRESS':
      return 'En proceso'
    case 'PENDING':
      return 'Lista para iniciar'
    default:
      return 'Pendiente'
  }
}

export default function DriverVerificationCallbackScreen() {
  const params = useLocalSearchParams<{ mode?: string; status?: string; verificationSessionId?: string }>()
  const { syncDriverVerification, driverProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [status, setStatus] = useState<string | undefined>(params.status)

  useEffect(() => {
    async function syncStatus() {
      try {
        const response = await syncDriverVerification(true)
        setStatus(response?.status)
        setNote(response?.notes ?? null)
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : 'No pude refrescar la verificacion.')
      } finally {
        setLoading(false)
      }
    }

    void syncStatus()
  }, [syncDriverVerification])

  function handleContinue() {
    if (driverProfile?.onboardingCompleted) {
      router.replace('/driver/home')
      return
    }

    router.replace({
      pathname: '/driver/setup',
      params: params.mode ? { mode: params.mode } : undefined,
    })
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          {loading
            ? <ActivityIndicator color={Theme.colors.black} />
            : <Ionicons name="shield-checkmark" size={24} color={Theme.colors.black} />
          }
        </View>

        <Text style={styles.title}>Resultado de Didit</Text>
        <Text style={styles.status}>{statusLabel(status)}</Text>

        <Text style={styles.copy}>
          {error
            ?? note
            ?? 'Actualizamos el estado de tu verificacion y volvemos al onboarding de conductor.'}
        </Text>

        <Button
          label={loading ? 'Sincronizando...' : 'Volver al onboarding'}
          onPress={handleContinue}
          disabled={loading}
          style={styles.button}
        />
      </View>
    </ScreenSafeArea>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 28,
    marginTop: 18,
  },
  status: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  copy: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 14,
  },
  button: {
    marginTop: 22,
  },
})
