import type { ReactNode } from 'react'
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { theme } from '../../theme'

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
  elevated?: 'none' | 'sm' | 'md'
}

export function Card({ children, style, padded = true, elevated = 'sm' }: Props) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        elevated !== 'none' && theme.shadows[elevated],
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  padded: {
    padding: theme.spacing.lg,
  },
})
