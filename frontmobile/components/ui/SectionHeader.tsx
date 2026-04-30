import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { theme } from '../../theme'

type Props = {
  title: string
  actionLabel?: string
  onActionPress?: () => void
  actionAccessibilityLabel?: string
  actionAccessibilityHint?: string
}

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  actionAccessibilityLabel,
  actionAccessibilityHint,
}: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          accessibilityHint={actionAccessibilityHint ?? `Abre ${title.toLowerCase()}.`}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  title: {
    ...theme.textStyles.titleSmall,
    color: theme.colors.text.primary,
    flex: 1,
  },
  action: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
  },
})
