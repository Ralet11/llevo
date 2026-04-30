import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { Colors } from '../../constants/colors'

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
        placeholderTextColor={Colors.gray}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: Colors.dark, marginBottom: 6 },
  input: {
    backgroundColor: Colors.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.grayMid,
  },
  inputError: { borderColor: Colors.red },
  error:      { fontSize: 12, color: Colors.red, marginTop: 4 },
})
