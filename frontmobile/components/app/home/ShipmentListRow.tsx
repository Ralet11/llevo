import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Theme } from '../../../constants/theme'
import type { MyShipment } from '../../../lib/shipments'
import { useTheme } from '../../../lib/theme'
import { Badge } from '../../ui/Badge'

function formatShipmentDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function ShipmentListRow({ shipment, onPress }: { shipment: MyShipment; onPress?: () => void }) {
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
      style={styles.row}
      onPress={onPress}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="cube-outline" size={16} color={colors.lime} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.route} numberOfLines={1}>
          {shipment.originCity} → {shipment.destinationCity}
        </Text>
        <Text style={styles.date}>{formatShipmentDate(shipment.createdAt)}</Text>
      </View>

      <Badge status={shipment.status} />
    </TouchableOpacity>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  route: {
    color: colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
  date: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
  },
})
