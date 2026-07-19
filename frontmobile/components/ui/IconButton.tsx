import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../../lib/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

type Props = {
  name: IconName
  onPress: () => void
  size?: number
  variant?: 'dark' | 'light' | 'lime'
  style?: ViewStyle
}

export function IconButton({ name, onPress, size = 22, variant = 'dark', style }: Props) {
  const { palette } = useTheme()
  const colors = palette.colors
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.base, variantStyles[variant](colors), style]}
    >
      <Ionicons name={name} size={size} color={variant === 'lime' ? colors.black : colors.text} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
})

const variantStyles = {
  dark: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: colors.mapOverlay, borderColor: colors.borderSoft }),
  light: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: colors.surfaceMuted, borderColor: colors.border }),
  lime: (colors: ReturnType<typeof useTheme>['palette']['colors']) => ({ backgroundColor: colors.lime, borderColor: colors.lime }),
}
