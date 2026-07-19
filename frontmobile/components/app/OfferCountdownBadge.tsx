import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

// Debe coincidir con OFFER_TIMEOUT_MS en api/src/services/shipmentQueue.ts: pasado
// este tiempo desde que se notificó al conductor, la oferta pasa al siguiente de la
// cola. El job que reasigna corre cada 5 min, asi que esto es una cuenta regresiva
// orientativa (crea urgencia), no una garantía al segundo de cuándo se reasigna.
const RESPONSE_WINDOW_MS = 15 * 60 * 1000
const WARNING_THRESHOLD_MS = 5 * 60 * 1000
const DANGER_THRESHOLD_MS = 2 * 60 * 1000

export function OfferCountdownBadge({ lastNotifiedAt }: { lastNotifiedAt: string | null }) {
  const { palette } = useTheme()
  const colors = palette.colors
  const deadline = lastNotifiedAt ? new Date(lastNotifiedAt).getTime() + RESPONSE_WINDOW_MS : null
  const [remainingMs, setRemainingMs] = useState<number | null>(() => (deadline ? deadline - Date.now() : null))

  useEffect(() => {
    if (!deadline) { setRemainingMs(null); return }
    setRemainingMs(deadline - Date.now())
    const interval = setInterval(() => setRemainingMs(deadline - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remainingMs === null) return null

  const clamped = Math.max(0, remainingMs)
  const minutes = Math.floor(clamped / 60000)
  const seconds = Math.floor((clamped % 60000) / 1000)
  const label = clamped <= 0 ? 'Reasignando…' : `${minutes}:${String(seconds).padStart(2, '0')}`

  const tone = clamped <= DANGER_THRESHOLD_MS
    ? { bg: colors.dangerSurface, fg: colors.danger, border: colors.danger }
    : clamped <= WARNING_THRESHOLD_MS
      ? { bg: 'rgba(255,184,77,0.14)', fg: colors.warning, border: colors.warning }
      : { bg: colors.surfaceElevated, fg: colors.textMuted, border: colors.border }

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Ionicons name="time-outline" size={13} color={tone.fg} />
      <Text style={[styles.text, { color: tone.fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  text: { fontFamily: Theme.fonts.bold, fontSize: 12 },
})
