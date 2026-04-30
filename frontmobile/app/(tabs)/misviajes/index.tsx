import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../../constants/colors'
import { TripCard } from '../../../components/TripCard'
import { Badge } from '../../../components/ui/Badge'
import { MOCK_MY_TRIPS, MOCK_MY_REQUESTS } from '../../../lib/mockData'

type Tab = 'driver' | 'requests'

export default function MisViajesScreen() {
  const [tab, setTab] = useState<Tab>('driver')

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis viajes</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, tab === 'driver' && styles.toggleActive]}
            onPress={() => setTab('driver')}
          >
            <Text style={[styles.toggleText, tab === 'driver' && styles.toggleTextActive]}>
              Como viajero
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, tab === 'requests' && styles.toggleActive]}
            onPress={() => setTab('requests')}
          >
            <Text style={[styles.toggleText, tab === 'requests' && styles.toggleTextActive]}>
              Mis solicitudes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'driver' ? (
          <>
            {MOCK_MY_TRIPS.length === 0 ? (
              <Empty
                icon="🚗"
                title="Todavía no publicaste viajes"
                desc="Publicá tu disponibilidad y empezá a recibir solicitudes."
                action="Publicar mi primer viaje"
                onAction={() => router.push('/(tabs)/publicar')}
              />
            ) : (
              MOCK_MY_TRIPS.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => router.push(`/trip/${trip.id}`)}
                  showStatus
                />
              ))
            )}
          </>
        ) : (
          <>
            {MOCK_MY_REQUESTS.length === 0 ? (
              <Empty
                icon="📋"
                title="No tenés solicitudes activas"
                desc="Buscá un viaje y hacé tu primera solicitud."
                action="Buscar viajes"
                onAction={() => router.push('/(tabs)/buscar')}
              />
            ) : (
              MOCK_MY_REQUESTS.map(req => {
                const trip = req.trip
                const date = new Date(trip.departureDate)
                const dateStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
                return (
                  <TouchableOpacity key={req.id} style={styles.reqCard}>
                    <View style={styles.reqHeader}>
                      <View>
                        <Text style={styles.reqRoute}>{trip.originCity} → {trip.destinationCity}</Text>
                        <Text style={styles.reqMeta}>{dateStr} · con {trip.driver.name}</Text>
                      </View>
                      <Badge status={req.status} />
                    </View>
                    <View style={styles.reqType}>
                      <Text style={styles.reqTypeText}>
                        {req.type === 'passenger'
                          ? `🧑 ${req.seats} asiento/s · $${(trip.pricePerSeat * (req.seats ?? 1)).toLocaleString()}`
                          : `📦 Paquete ${req.weightKg}kg · $${(trip.pricePerKg * (req.weightKg ?? 0)).toLocaleString()}`
                        }
                      </Text>
                    </View>
                    {req.status === 'ACCEPTED' && (
                      <View style={styles.reqAction}>
                        <Text style={styles.reqActionText}>
                          🕐 Viaje confirmado. El pago se libera al llegar.
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

function Empty({ icon, title, desc, action, onAction }: {
  icon: string; title: string; desc: string; action: string; onAction: () => void
}) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.desc}>{desc}</Text>
      <TouchableOpacity style={emptyStyles.btn} onPress={onAction}>
        <Text style={emptyStyles.btnText}>{action}</Text>
      </TouchableOpacity>
    </View>
  )
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  icon:      { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 8, textAlign: 'center' },
  desc:      { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn:       { backgroundColor: Colors.navy, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:   { color: Colors.white, fontWeight: '700' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20,
  },
  title: { color: Colors.white, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  toggle: {
    flexDirection: 'row', backgroundColor: Colors.navyLight,
    borderRadius: 12, padding: 3,
  },
  toggleBtn:       { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleActive:    { backgroundColor: Colors.white },
  toggleText:      { fontSize: 13, color: Colors.blueM, fontWeight: '600' },
  toggleTextActive:{ color: Colors.navy },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  reqCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  reqHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reqRoute:    { fontSize: 15, fontWeight: '700', color: Colors.dark, marginBottom: 2 },
  reqMeta:     { fontSize: 12, color: Colors.gray },
  reqType:     { backgroundColor: Colors.grayLight, borderRadius: 8, padding: 10 },
  reqTypeText: { fontSize: 13, color: Colors.dark, fontWeight: '600' },
  reqAction:   { marginTop: 10, backgroundColor: Colors.greenLight, borderRadius: 8, padding: 10 },
  reqActionText:{ fontSize: 12, color: Colors.green },
})
