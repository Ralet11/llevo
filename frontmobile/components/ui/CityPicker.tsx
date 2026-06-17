import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Theme } from '../../constants/theme'
import { autocompletePlaces, type PlaceSuggestion } from '../../lib/maps'

type Props = {
  label?: string
  value: string
  onChangeCity: (city: string) => void
  placeholder?: string
}

export function CityPicker({ label, value, onChangeCity, placeholder }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChangeText(text: string) {
    setQuery(text)
    if (text !== value) onChangeCity('')

    if (debounce.current) clearTimeout(debounce.current)

    if (text.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await autocompletePlaces({ input: text.trim(), citiesOnly: true })
        setSuggestions(results)
        setOpen(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(suggestion: PlaceSuggestion) {
    const city = suggestion.mainText
    setQuery(city)
    onChangeCity(city)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, open && styles.inputRowOpen]}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? 'Buscar ciudad...'}
          placeholderTextColor={Theme.colors.textSubtle}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {loading && (
          <ActivityIndicator size="small" color={Theme.colors.lime} style={styles.spinner} />
        )}
      </View>

      {open && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item.placeId}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.suggestion, index < suggestions.length - 1 && styles.suggestionBorder]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionMain}>{item.mainText}</Text>
                {item.secondaryText ? (
                  <Text style={styles.suggestionSub}>{item.secondaryText}</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16, zIndex: 10 },
  label: {
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputRowOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: Theme.colors.lime,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    color: Colors.text,
  },
  spinner: { marginLeft: 8 },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Theme.colors.lime,
    borderBottomLeftRadius: Theme.radius.md,
    borderBottomRightRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  suggestionMain: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 14,
  },
  suggestionSub: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
})
