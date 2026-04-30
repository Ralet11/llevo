import type { ComponentProps } from 'react'
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { theme } from '../../theme'
import { Icon } from './Icon'

type Props = {
  icon: ComponentProps<typeof Icon>['name']
  onPress: () => void
  style?: StyleProp<ViewStyle>
  tone?: 'surface' | 'brand'
  accessibilityLabel?: string
  accessibilityHint?: string
}

export function IconButton({
  icon,
  onPress,
  style,
  tone = 'surface',
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Boton de accion'}
      accessibilityHint={accessibilityHint}
      style={[styles.base, styles[tone], tone === 'surface' ? theme.shadows.sm : null, style]}
    >
      <Icon
        name={icon}
        size={18}
        color={tone === 'brand' ? theme.colors.icon.inverse : theme.colors.icon.primary}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  brand: {
    backgroundColor: theme.colors.action.primary,
  },
})
