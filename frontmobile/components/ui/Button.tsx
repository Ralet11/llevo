import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

type Props = {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  fullWidth?: boolean
}

export function Button({
  label, onPress, variant = 'primary',
  loading = false, disabled = false, style, fullWidth = true,
}: Props) {
  const { palette } = useTheme()
  const colors = palette.colors
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variantStyles[variant](colors),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? colors.black : colors.lime} />
        : <Text style={[styles.label, labelStyles[variant](colors)]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  label:          { fontSize: 15, fontFamily: Theme.fonts.bold },
})

const variantStyles = {
  primary: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: colors.lime }),
  secondary: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: colors.surfaceElevated }),
  outline: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: 'transparent' as const, borderWidth: 1.5, borderColor: colors.border }),
  ghost: () => ({ backgroundColor: 'transparent' as const }),
  danger: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: colors.danger }),
}

const labelStyles = {
  primary: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ color: colors.black }),
  secondary: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ color: colors.text }),
  outline: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ color: colors.text }),
  ghost: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ color: colors.lime }),
  danger: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ color: colors.white }),
}
