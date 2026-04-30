import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { MOCK_TRIPS, MOCK_REVIEWS } from '../../lib/mockData'

type RequestMode = 'passenger' | 'package' | null

export default function TripDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const trip    = MOCK_TRIPS.find(t => t.id === id) ?? MOCK_TRIPS[0]
  const [mode,  setMode]  = useState<RequestMode>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [weightKg, setWeightKg] = useState('')

  const date = new Date(trip.departureDate)
  const dateStr = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  async function handleRequest() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000)) // TODO: llamada real API
    setLoading(false)
    setMode(null)
    Alert.alert('¡Solicitud enviada!', 'El viajero revisará tu solicitud y te confirmará a la brevedad.')
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Viajero */}
      <View style={styles.driverCard}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverInitials}>{trip.driver.initials}</Text>
        </View>
        <View style={styles.driverInfo}>
          <View style={styles.driverNameRow}>
            <Text style={styles.driverName}>{trip.driver.name}</Text>
            {trip.driver.isVerified && <Badge status="ACCEPTED" label="Verificado" />}
          </View>
          <Text style={styles.driverRating}>
            {'★'.repeat(Math.floor(trip.driver.rating))} {trip.driver.rating} · {trip.driver.ratingCount} viajes
          </Text>
        </View>
      </View>

      {/* Ruta */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={styles.routeCol}>
            <View style={[styles.routeDot, { backgroundColor: Colors.navy }]} />
            <Text style={styles.routeCity}>{trip.originCity}</Text>
            <Text style={styles.routeTime}>{timeStr}</Text>
          </View>
          <View style={styles.routeArrow}>
            <View style={styles.routeLine} />
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={[styles.routeCol, { alignItems: 'flex-end' }]}>
            <View style={[styles.routeDot, { backgroundColor: Colors.amber }]} />
            <Text style={styles.routeCity}>{trip.destinationCity}</Text>
            <Text style={styles.routeTime}>~2 hs</Text>
          </View>
        </View>
        <Text style={styles.routeDate}>{dateStr}</Text>
      </View>

      {/* Disponibilidad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disponibilidad</Text>
        <View style={styles.availability}>
          {trip.availableSeats > 0 && (
            <View style={styles.availItem}>
              <Text style={styles.availIcon}>🧑</Text>
              <Text style={styles.availLabel}>Asientos</Text>
              <Text style={styles.availValue}>{trip.availableSeats} disponibles</Text>
              <Text style={styles.availPrice}>${trip.pricePerSeat.toLocaleString()} c/u</Text>
            </View>
          )}
          {trip.availableKg > 0 && (
            <View style={styles.availItem}>
              <Text style={styles.availIcon}>📦</Text>
              <Text style={styles.availLabel}>Carga</Text>
              <Text style={styles.availValue}>{trip.availableKg} kg disponibles</Text>
              <Text style={styles.availPrice}>${trip.pricePerKg}/kg</Text>
            </View>
          )}
        </View>
      </View>

      {/* Notas */}
      {trip.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas del viajero</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        </View>
      )}

      {/* Reseñas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reseñas recientes</Text>
        {MOCK_REVIEWS.map(rev => (
          <View key={rev.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewName}>{rev.fromName}</Text>
              <Text style={styles.reviewStars}>{'★'.repeat(rev.rating)}</Text>
            </View>
            <Text style={styles.reviewComment}>{rev.comment}</Text>
          </View>
        ))}
      </View>

      {/* Escrow info */}
      <View style={styles.escrowInfo}>
        <Text style={styles.escrowIcon}>🔒</Text>
        <Text style={styles.escrowText}>
          El pago queda en custodia hasta confirmar la entrega. Tu dinero está protegido.
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        {trip.availableSeats > 0 && (
          <Button label="🧑 Solicitar asiento" onPress={() => setMode('passenger')} variant="secondary" />
        )}
        {trip.availableKg > 0 && (
          <Button label="📦 Enviar paquete" onPress={() => setMode('package')} variant="outline" style={{ marginTop: 10 }} />
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* Modal solicitud */}
      <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => setMode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {mode === 'passenger' ? 'Solicitar asiento' : 'Enviar paquete'}
            </Text>
            <Text style={styles.modalSub}>
              {trip.originCity} → {trip.destinationCity} · {dateStr}
            </Text>

            {mode === 'package' && (
              <Input
                label="Peso aproximado (kg)"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="Ej: 3"
              />
            )}

            <Input
              label="Mensaje para el viajero (opcional)"
              value={message}
              onChangeText={setMessage}
              placeholder="Ej: Paso por el centro si podés parar..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.priceSummary}>
              <Text style={styles.priceLabel}>Total estimado</Text>
              <Text style={styles.priceValue}>
                {mode === 'passenger'
                  ? `$${trip.pricePerSeat.toLocaleString()}`
                  : weightKg
                    ? `$${(Number(weightKg) * trip.pricePerKg).toLocaleString()}`
                    : '$—'
                }
              </Text>
            </View>

            <Button label="Confirmar solicitud" onPress={handleRequest} loading={loading} />
            <Button label="Cancelar" onPress={() => setMode(null)} variant="ghost" style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },

  driverCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.navy,
    padding: 20, gap: 14,
  },
  driverAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  driverInitials: { color: Colors.navy, fontWeight: '800', fontSize: 20 },
  driverInfo:     { flex: 1 },
  driverNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  driverName:     { color: Colors.white, fontSize: 18, fontWeight: '700' },
  driverRating:   { color: Colors.blueM, fontSize: 13 },

  routeCard: {
    backgroundColor: Colors.white, margin: 16, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  routeRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routeCol:  { alignItems: 'flex-start' },
  routeDot:  { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
  routeCity: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  routeTime: { fontSize: 13, color: Colors.gray, marginTop: 2 },
  routeArrow:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  routeLine: { flex: 1, height: 1, backgroundColor: Colors.grayMid },
  arrowText: { fontSize: 18, color: Colors.gray },
  routeDate: { fontSize: 13, color: Colors.gray, textAlign: 'center' },

  section:      { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark, marginBottom: 10 },

  availability: { flexDirection: 'row', gap: 12 },
  availItem: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  availIcon:  { fontSize: 24, marginBottom: 6 },
  availLabel: { fontSize: 12, color: Colors.gray, marginBottom: 2 },
  availValue: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  availPrice: { fontSize: 15, fontWeight: '700', color: Colors.navy, marginTop: 4 },

  notesBox: { backgroundColor: Colors.blueLight, borderRadius: 12, padding: 14 },
  notesText:{ fontSize: 14, color: Colors.navyLight, lineHeight: 20 },

  reviewCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewName:   { fontSize: 13, fontWeight: '700', color: Colors.dark },
  reviewStars:  { color: Colors.amber, fontSize: 12 },
  reviewComment:{ fontSize: 13, color: Colors.gray, lineHeight: 18 },

  escrowInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.greenLight,
    marginHorizontal: 16, marginVertical: 8,
    borderRadius: 12, padding: 14,
  },
  escrowIcon: { fontSize: 18 },
  escrowText: { flex: 1, fontSize: 12, color: Colors.green, lineHeight: 18 },

  ctas: { paddingHorizontal: 16, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.grayMid,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: Colors.gray, marginBottom: 20 },

  priceSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.grayLight, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  priceLabel: { fontSize: 14, color: Colors.gray },
  priceValue: { fontSize: 22, fontWeight: '800', color: Colors.navy },
})
