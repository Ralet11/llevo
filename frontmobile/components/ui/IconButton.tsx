import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { Theme } from '../../constants/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

type Props = {
  name: IconName
  onPress: () => void
  size?: number
  variant?: 'dark' | 'light' | 'lime'
  style?: ViewStyle
}

export function IconButton({ name, onPress, size = 22, variant = 'dark', style }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.base, styles[variant], style]}
    >
      <Ionicons name={name} size={size} color={variant === 'lime' ? Theme.colors.black : Theme.colors.text} />
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
  dark: {
    backgroundColor: Theme.colors.mapOverlay,
    borderColor: Theme.colors.borderSoft,
  },
  light: {
    backgroundColor: Theme.colors.surfaceMuted,
    borderColor: Theme.colors.border,
  },
  lime: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
})
