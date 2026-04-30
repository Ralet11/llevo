import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'

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
        ? <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Colors.navy : Colors.white} />
        : <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  primary:   { backgroundColor: Colors.amber },
  secondary: { backgroundColor: Colors.navy },
  outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.navy },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: Colors.red },

  label:          { fontSize: 15, fontWeight: '700' },
  label_primary:  { color: Colors.navy },
  label_secondary:{ color: Colors.white },
  label_outline:  { color: Colors.navy },
  label_ghost:    { color: Colors.navyLight },
  label_danger:   { color: Colors.white },
})
