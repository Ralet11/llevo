import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { COUNTRIES, type Country } from '../../constants/countries'
import { Theme } from '../../constants/theme'

type Props = {
  visible: boolean
  selectedIso2?: string
  onClose: () => void
  onSelect: (country: Country) => void
}

export function CountryPicker({ visible, selectedIso2, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')

  const data = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(
      country =>
        country.name.toLowerCase().includes(q) ||
        country.dial.includes(q) ||
        country.iso2.toLowerCase() === q
    )
  }, [query])

  function handleSelect(country: Country) {
    onSelect(country)
    setQuery('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Elegi tu pais</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Theme.colors.textSubtle} />
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar pais o codigo..."
              placeholderTextColor={Theme.colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={data}
            keyExtractor={item => item.iso2}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => {
              const active = item.iso2 === selectedIso2
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.dial}>{item.dial}</Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={Theme.colors.lime} />
                  ) : null}
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Theme.colors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 17,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  rowActive: {
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: 12,
    borderBottomColor: 'transparent',
  },
  flag: {
    fontSize: 22,
  },
  name: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 14,
  },
  dial: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  empty: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
})
