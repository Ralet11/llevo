import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Theme } from '../../constants/theme'
import { useDriverRoutes } from '../../lib/driverRoutes'
import { useTheme } from '../../lib/theme'

// Pill de estado persistente: se puede montar en cualquier tab del modo
// conductor (no solo en Home) para que el estado online/pausar sea visible
// y accionable sin importar en que pantalla este el chofer.
export function DriverOnlineBar() {
  const { isLocalOnline, onlineCities, localCity, localBusy, setLocalOnline } = useDriverRoutes()
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)

  if (!isLocalOnline) return null

  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <View style={styles.dot} />
        <Text style={styles.chipText} numberOfLines={1}>
          Online en {onlineCities.join(', ') || localCity}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.pauseBtn}
        activeOpacity={0.85}
        disabled={localBusy}
        onPress={() => void setLocalOnline(false)}
      >
        {localBusy
          ? <ActivityIndicator size="small" color={colors.text} />
          : <>
              <Ionicons name="pause" size={14} color={colors.text} />
              <Text style={styles.pauseBtnText}>Pausar</Text>
            </>}
      </TouchableOpacity>
    </View>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.lime,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  chipText: { flex: 1, color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  pauseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  pauseBtnText: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
})
