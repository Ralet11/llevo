import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../../constants/colors'
import { TripCard } from '../../../components/TripCard'
import { MOCK_TRIPS } from '../../../lib/mockData'

type Mode = 'passenger' | 'package'

export default function BuscarScreen() {
  const [mode,   setMode]   = useState<Mode>('passenger')
  const [origin, setOrigin] = useState('')
  const [dest,   setDest]   = useState('')
  const [searched, setSearched] = useState(false)

  const filtered = MOCK_TRIPS.filter(t => {
    if (!origin && !dest) return true
    const o = t.originCity.toLowerCase().includes(origin.toLowerCase())
    const d = t.destinationCity.toLowerCase().includes(dest.toLowerCase())
    return (!origin || o) && (!dest || d)
  })

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>

        {/* Mode toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'passenger' && styles.toggleActive]}
            onPress={() => setMode('passenger')}
          >
            <Text style={[styles.toggleText, mode === 'passenger' && styles.toggleTextActive]}>
              🧑 Pasajero
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'package' && styles.toggleActive]}
            onPress={() => setMode('package')}
          >
            <Text style={[styles.toggleText, mode === 'package' && styles.toggleTextActive]}>
              📦 Paquete
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search inputs */}
        <View style={styles.inputs}>
          <View style={styles.inputRow}>
            <View style={[styles.dot, { backgroundColor: Colors.navy }]} />
            <TextInput
              style={styles.input}
              placeholder="Ciudad de origen"
              placeholderTextColor={Colors.gray}
              value={origin}
              onChangeText={setOrigin}
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <View style={[styles.dot, { backgroundColor: Colors.amber }]} />
            <TextInput
              style={styles.input}
              placeholder="Ciudad de destino"
              placeholderTextColor={Colors.gray}
              value={dest}
              onChangeText={setDest}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={() => setSearched(true)}>
          <Text style={styles.searchBtnText}>Buscar viajes</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsMeta}>
          <Text style={styles.resultsCount}>{filtered.length} viajes disponibles</Text>
          {mode === 'package' && (
            <TouchableOpacity>
              <Text style={styles.alertLink}>+ Crear alerta para esta ruta</Text>
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyDesc}>No hay viajes para esa ruta. Creá una alerta y te avisamos cuando aparezca uno.</Text>
            <TouchableOpacity style={styles.alertBtn}>
              <Text style={styles.alertBtnText}>Crear alerta de ruta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => router.push(`/trip/${trip.id}`)}
            />
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },

  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20,
  },
  title: { color: Colors.white, fontSize: 24, fontWeight: '800', marginBottom: 16 },

  toggle: {
    flexDirection: 'row', backgroundColor: Colors.navyLight,
    borderRadius: 12, padding: 3, marginBottom: 14,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.white },
  toggleText:   { fontSize: 13, color: Colors.blueM, fontWeight: '600' },
  toggleTextActive: { color: Colors.navy },

  inputs: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 12, marginBottom: 12,
  },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:         { width: 10, height: 10, borderRadius: 5 },
  input:       { flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 8 },
  inputDivider:{ height: 1, backgroundColor: Colors.grayMid, marginVertical: 4, marginLeft: 20 },

  searchBtn: {
    backgroundColor: Colors.amber, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  searchBtnText: { color: Colors.navy, fontSize: 15, fontWeight: '700' },

  results:      { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  resultsMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultsCount: { fontSize: 13, color: Colors.gray },
  alertLink:    { fontSize: 13, color: Colors.navyLight, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  alertBtn:   { backgroundColor: Colors.navy, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  alertBtnText:{ color: Colors.white, fontWeight: '700' },
})
