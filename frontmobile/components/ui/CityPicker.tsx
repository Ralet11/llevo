import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
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
  icon?: React.ComponentProps<typeof Ionicons>['name']
}

export function CityPicker({ label, value, onChangeCity, placeholder, icon }: Props) {
  const [query, setQuery] = useState(value)

  // The picker can stay mounted while its parent receives new route params
  // (for example, when opening a saved route alert from Home).
  useEffect(() => {
    setQuery(value)
  }, [value])
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current)
  }, [])

  function handleChangeText(text: string) {
    setQuery(text)
    setSearchError(null)
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
        if (results.length === 0) setSearchError('No encontramos ciudades. Probá con otro nombre.')
      } catch (error) {
        setSuggestions([])
        setOpen(false)
        setSearchError(error instanceof Error ? error.message : 'No pudimos consultar Google Maps.')
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(suggestion: PlaceSuggestion) {
    const city = suggestion.mainText
    setQuery(city)
    onChangeCity(city)
    setSearchError(null)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <View style={[styles.wrapper, open && styles.wrapperOpen]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, open && styles.inputRowOpen]}>
        {icon ? <Ionicons name={icon} size={16} color={Theme.colors.lime} style={styles.leadingIcon} /> : null}
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
        {!loading && value && query === value ? (
          <Ionicons name="checkmark-circle" size={18} color={Theme.colors.success} style={styles.spinner} />
        ) : null}
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
      {searchError ? (
        <View style={styles.feedbackRow}>
          <Ionicons name="alert-circle-outline" size={14} color={Theme.colors.warning} />
          <Text style={styles.feedbackText}>{searchError}</Text>
        </View>
      ) : !value && query.trim().length >= 2 && !loading && !open ? (
        <Text style={styles.selectionHint}>Seleccioná una ciudad de la lista para continuar.</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16, zIndex: 1 },
  wrapperOpen: { zIndex: 100, elevation: 20 },
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
  leadingIcon: { marginRight: 10 },
  spinner: { marginLeft: 8 },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Theme.colors.lime,
    borderBottomLeftRadius: Theme.radius.md,
    borderBottomRightRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
    zIndex: 101,
    elevation: 20,
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
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  feedbackText: { flex: 1, color: Theme.colors.warning, fontFamily: Theme.fonts.medium, fontSize: 11, lineHeight: 16 },
  selectionHint: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, marginTop: 7 },
})
