import type { ComponentProps } from 'react'
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { theme } from '../../theme'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

type Props = {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  fullWidth?: boolean
  leftIcon?: ComponentProps<typeof Icon>['name']
  rightIcon?: ComponentProps<typeof Icon>['name']
  accessibilityLabel?: string
  accessibilityHint?: string
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const iconColor =
    variant === 'primary'
      ? theme.colors.action.accentText
      : variant === 'secondary' || variant === 'danger'
        ? theme.colors.action.primaryText
        : theme.colors.text.brand

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'ghost'
              ? theme.colors.text.brand
              : theme.colors.action.primaryText
          }
        />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <Icon name={leftIcon} size={18} color={iconColor} /> : null}
          <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
          {rightIcon ? <Icon name={rightIcon} size={18} color={iconColor} /> : null}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.55 },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },

  primary: {
    backgroundColor: theme.colors.action.accent,
    borderWidth: 1,
    borderColor: theme.colors.action.accent,
    ...theme.shadows.sm,
  },
  secondary: {
    backgroundColor: theme.colors.action.primary,
    borderWidth: 1,
    borderColor: theme.colors.action.primary,
    ...theme.shadows.sm,
  },
  outline: {
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.action.danger,
    borderWidth: 1,
    borderColor: theme.colors.action.danger,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.textStyles.label,
  },
  label_primary: { color: theme.colors.action.accentText },
  label_secondary: { color: theme.colors.action.primaryText },
  label_outline: { color: theme.colors.text.brand },
  label_ghost: { color: theme.colors.text.brand },
  label_danger: { color: theme.colors.action.dangerText },
})
