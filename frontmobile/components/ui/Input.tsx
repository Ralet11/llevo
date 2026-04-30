import type { ComponentProps } from 'react'
import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native'
import { theme } from '../../theme'
import { Icon } from './Icon'

type Props = TextInputProps & {
  label?: string
  error?: string
  hint?: string
  leadingIcon?: ComponentProps<typeof Icon>['name']
}

export function Input({
  label,
  error,
  hint,
  leadingIcon,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, focused && styles.inputFocused, error && styles.inputError]}>
        {leadingIcon ? (
          <Icon
            name={leadingIcon}
            size={18}
            color={focused ? theme.colors.icon.brand : theme.colors.icon.muted}
          />
        ) : null}
        <TextInput
          {...props}
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.text.subtle}
          accessibilityLabel={props.accessibilityLabel ?? label ?? props.placeholder}
          accessibilityHint={error ?? hint ?? props.accessibilityHint}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          textAlignVertical={props.multiline ? 'top' : 'center'}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  inputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  input: {
    flex: 1,
    ...theme.textStyles.body,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.xs,
  },
  inputFocused: {
    borderColor: theme.colors.text.brand,
    backgroundColor: theme.colors.background.elevated,
  },
  inputError: {
    borderColor: theme.colors.text.danger,
  },
  hint: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  error: {
    ...theme.textStyles.caption,
    color: theme.colors.text.danger,
    marginTop: theme.spacing.xs,
  },
})
