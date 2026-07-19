import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

type Props = TextInputProps & {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...props }: Props) {
  const { palette } = useTheme()
  const colors = palette.colors
  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>}
      <TextInput
        style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.text, borderColor: error ? colors.danger : colors.border }, style]}
        placeholderTextColor={colors.textSubtle}
        {...props}
      />
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  label:      { fontSize: 12, fontFamily: Theme.fonts.semiBold, marginBottom: 6 },
  input: {
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    borderWidth: 1,
  },
  error:      { fontSize: 12, fontFamily: Theme.fonts.medium, marginTop: 4 },
})
