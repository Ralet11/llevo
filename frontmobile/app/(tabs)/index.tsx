import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../constants/colors'
import { TripCard } from '../../components/TripCard'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../lib/auth'
import { MOCK_TRIPS, MOCK_MY_REQUESTS } from '../../lib/mockData'

export default function InicioScreen() {
  const { user } = useAuth()
  const pending  = MOCK_MY_REQUESTS.filter(r => r.status === 'PENDING')
  const accepted = MOCK_MY_REQUESTS.filter(r => r.status === 'ACCEPTED')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </Text>
        </View>
      </View>

      {/* Quick search */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/buscar')}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>¿A dónde vas? ¿Qué enviás?</Text>
      </TouchableOpacity>

      {/* Solicitudes activas */}
      {(pending.length > 0 || accepted.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus solicitudes activas</Text>
          {MOCK_MY_REQUESTS.map(req => (
            <TouchableOpacity key={req.id} style={styles.requestCard} onPress={() => router.push('/(tabs)/misviajes')}>
              <View style={styles.requestLeft}>
                <Text style={styles.requestRoute}>
                  {req.trip.originCity} → {req.trip.destinationCity}
                </Text>
                <Text style={styles.requestMeta}>
                  {req.type === 'passenger' ? `${req.seats} asiento/s` : `Paquete · ${req.weightKg}kg`}
                </Text>
              </View>
              <Badge status={req.status} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Viajes disponibles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Viajes disponibles</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/buscar')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {MOCK_TRIPS.slice(0, 3).map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => router.push(`/trip/${trip.id}`)}
          />
        ))}
      </View>

      {/* Publicar CTA */}
      <TouchableOpacity style={styles.publishCTA} onPress={() => router.push('/(tabs)/publicar')}>
        <View>
          <Text style={styles.publishCTATitle}>¿Viajás entre ciudades?</Text>
          <Text style={styles.publishCTADesc}>Publicá tu disponibilidad y generá ingresos extra</Text>
        </View>
        <Text style={styles.publishCTAArrow}>→</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24,
  },
  greeting:   { color: Colors.blueM, fontSize: 14 },
  userName:   { color: Colors.white, fontSize: 24, fontWeight: '800' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.navy, fontWeight: '800', fontSize: 16 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white,
    marginHorizontal: 16, marginTop: -16,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  searchIcon:        { fontSize: 16 },
  searchPlaceholder: { color: Colors.gray, fontSize: 15 },

  section:       { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: '700', color: Colors.dark, marginBottom: 12 },
  seeAll:        { fontSize: 13, color: Colors.navyLight, fontWeight: '600' },

  requestCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  requestLeft:  { flex: 1 },
  requestRoute: { fontSize: 14, fontWeight: '600', color: Colors.dark, marginBottom: 2 },
  requestMeta:  { fontSize: 12, color: Colors.gray },

  publishCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.navy,
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 16, padding: 20,
  },
  publishCTATitle: { color: Colors.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  publishCTADesc:  { color: Colors.blueM, fontSize: 12 },
  publishCTAArrow: { color: Colors.amber, fontSize: 24, fontWeight: '300' },
})
