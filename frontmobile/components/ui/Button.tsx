import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'
import { Theme } from '../../constants/theme'

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
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? Theme.colors.black : Theme.colors.lime} />
        : <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
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

  primary:   { backgroundColor: Colors.lime },
  secondary: { backgroundColor: Colors.surfaceElevated },
  outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: Colors.red },

  label:          { fontSize: 15, fontFamily: Theme.fonts.bold },
  label_primary:  { color: Theme.colors.black },
  label_secondary:{ color: Colors.white },
  label_outline:  { color: Colors.white },
  label_ghost:    { color: Colors.lime },
  label_danger:   { color: Colors.white },
})
