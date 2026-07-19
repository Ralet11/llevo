import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Theme } from '../../../constants/theme'
import type { MyShipment } from '../../../lib/shipments'
import { useTheme } from '../../../lib/theme'

export function ActiveShipmentStrip({ shipment, onPress }: { shipment: MyShipment; onPress: () => void }) {
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const statusCopy: Record<string, { label: string; color: string }> = {
    SEARCHING: { label: 'Buscando conductor', color: colors.warning },
    ASSIGNED: { label: 'Conductor asignado', color: colors.info },
    PICKED_UP: { label: 'Paquete en camino', color: colors.info },
  }
  const copy = statusCopy[shipment.status] ?? { label: 'Envio en curso', color: colors.lime }

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.strip} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: copy.color }]} />
      <Text style={styles.text} numberOfLines={1}>
        {copy.label} · {shipment.originCity} → {shipment.destinationCity}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
})
