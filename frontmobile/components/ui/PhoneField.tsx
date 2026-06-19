import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { type Country } from '../../constants/countries'
import { Theme } from '../../constants/theme'
import { CountryPicker } from './CountryPicker'

type Props = {
  label?: string
  country: Country
  onChangeCountry: (country: Country) => void
  national: string
  onChangeNational: (value: string) => void
  placeholder?: string
}

export function PhoneField({
  label,
  country,
  onChangeCountry,
  national,
  onChangeNational,
  placeholder,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.countryBtn}
          activeOpacity={0.8}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dial}>{country.dial}</Text>
          <Ionicons name="chevron-down" size={14} color={Theme.colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={national}
          onChangeText={text => onChangeNational(text.replace(/[^\d]/g, ''))}
          placeholder={placeholder ?? '11 2345 6789'}
          placeholderTextColor={Theme.colors.textSubtle}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </View>

      <CountryPicker
        visible={pickerOpen}
        selectedIso2={country.iso2}
        onClose={() => setPickerOpen(false)}
        onSelect={onChangeCountry}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  flag: {
    fontSize: 18,
  },
  dial: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  input: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text,
  },
})
