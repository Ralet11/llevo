import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { Colors } from '../../constants/colors'
import { Theme } from '../../constants/theme'

type Props = TextInputProps & {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Theme.colors.textSubtle}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  label:      { fontSize: 12, fontFamily: Theme.fonts.semiBold, color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.red },
  error:      { fontSize: 12, fontFamily: Theme.fonts.medium, color: Colors.red, marginTop: 4 },
})
