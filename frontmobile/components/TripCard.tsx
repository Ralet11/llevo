import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import { Badge } from './ui/Badge'
import type { Trip } from '../lib/mockData'

type Props = {
  trip: Trip
  onPress: () => void
  showStatus?: boolean
}

function Stars({ rating }: { rating: number }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </Text>
  )
}

export function TripCard({ trip, onPress, showStatus = false }: Props) {
  const date = new Date(trip.departureDate)
  const dateStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header: viajero */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{trip.driver.initials}</Text>
        </View>
        <View style={styles.driverInfo}>
          <View style={styles.driverRow}>
            <Text style={styles.driverName}>{trip.driver.name}</Text>
            {trip.driver.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.ratingRow}>
            <Stars rating={trip.driver.rating} />
            <Text style={styles.ratingCount}> {trip.driver.rating} ({trip.driver.ratingCount})</Text>
          </View>
        </View>
        {showStatus && <Badge status={trip.status} />}
      </View>

      {/* Ruta */}
      <View style={styles.route}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: Colors.navy }]} />
          <Text style={styles.city}>{trip.originCity}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: Colors.amber }]} />
          <Text style={styles.city}>{trip.destinationCity}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Fecha</Text>
          <Text style={styles.infoValue}>{dateStr}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Salida</Text>
          <Text style={styles.infoValue}>{timeStr}</Text>
        </View>
        {trip.availableSeats > 0 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Asientos</Text>
            <Text style={styles.infoValue}>{trip.availableSeats} · ${trip.pricePerSeat.toLocaleString()}</Text>
          </View>
        )}
        {trip.availableKg > 0 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Carga</Text>
            <Text style={styles.infoValue}>{trip.availableKg}kg · ${trip.pricePerKg}/kg</Text>
          </View>
        )}
      </View>

      {trip.notes && (
        <Text style={styles.notes} numberOfLines={1}>💬 {trip.notes}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  header:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText:  { color: Colors.white, fontWeight: '700', fontSize: 15 },
  driverInfo:  { flex: 1 },
  driverRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName:  { fontSize: 15, fontWeight: '700', color: Colors.dark },
  verifiedBadge: {
    backgroundColor: Colors.navy, borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  verifiedText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  stars:       { color: Colors.amber, fontSize: 11 },
  ratingCount: { fontSize: 11, color: Colors.gray },

  route:      { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  city:       { fontSize: 15, fontWeight: '600', color: Colors.dark },
  routeLine: {
    width: 2, height: 14, backgroundColor: Colors.grayMid,
    marginLeft: 4, marginVertical: 3,
  },

  info:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  infoItem:   {},
  infoLabel:  { fontSize: 11, color: Colors.gray, marginBottom: 2 },
  infoValue:  { fontSize: 13, fontWeight: '600', color: Colors.dark },

  notes:      { fontSize: 12, color: Colors.gray, fontStyle: 'italic' },
})
