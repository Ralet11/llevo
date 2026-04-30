import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Colors } from '../../../constants/colors'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'

type TripType = 'single' | 'recurring'
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function PublicarScreen() {
  const [tripType,  setTripType]  = useState<TripType>('single')
  const [origin,    setOrigin]    = useState('')
  const [dest,      setDest]      = useState('')
  const [date,      setDate]      = useState('')
  const [time,      setTime]      = useState('')
  const [seats,     setSeats]     = useState('0')
  const [priceS,    setPriceS]    = useState('')
  const [kg,        setKg]        = useState('0')
  const [priceKg,   setPriceKg]   = useState('')
  const [notes,     setNotes]     = useState('')
  const [days,      setDays]      = useState<number[]>([])
  const [loading,   setLoading]   = useState(false)

  function toggleDay(i: number) {
    setDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])
  }

  async function handlePublish() {
    if (!origin || !dest) { Alert.alert('Completá al menos origen y destino'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000)) // TODO: API call
    setLoading(false)
    Alert.alert('¡Viaje publicado!', 'Tu disponibilidad ya es visible para otros usuarios.')
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Publicar viaje</Text>
        <Text style={styles.subtitle}>Completá tu disponibilidad y empezá a recibir solicitudes</Text>
      </View>

      <View style={styles.form}>
        {/* Tipo */}
        <Text style={styles.sectionLabel}>Tipo de publicación</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, tripType === 'single' && styles.toggleActive]}
            onPress={() => setTripType('single')}
          >
            <Text style={styles.toggleIcon}>📅</Text>
            <Text style={[styles.toggleText, tripType === 'single' && styles.toggleTextActive]}>Viaje único</Text>
            <Text style={styles.toggleDesc}>Una fecha específica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, tripType === 'recurring' && styles.toggleActive]}
            onPress={() => setTripType('recurring')}
          >
            <Text style={styles.toggleIcon}>🔁</Text>
            <Text style={[styles.toggleText, tripType === 'recurring' && styles.toggleTextActive]}>Recurrente</Text>
            <Text style={styles.toggleDesc}>Días fijos cada semana</Text>
          </TouchableOpacity>
        </View>

        {/* Ruta */}
        <Text style={styles.sectionLabel}>Ruta</Text>
        <Input label="Ciudad de origen" value={origin} onChangeText={setOrigin} placeholder="Ej: Mercedes" />
        <Input label="Ciudad de destino" value={dest} onChangeText={setDest} placeholder="Ej: Buenos Aires" />

        {/* Fecha / Días */}
        {tripType === 'single' ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Fecha" value={date} onChangeText={setDate} placeholder="DD/MM/AAAA" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Hora de salida" value={time} onChangeText={setTime} placeholder="07:00" />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Días de la semana</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayBtn, days.includes(i) && styles.dayBtnActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayText, days.includes(i) && styles.dayTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Hora habitual de salida" value={time} onChangeText={setTime} placeholder="07:00" />
          </>
        )}

        {/* Pasajeros */}
        <Text style={styles.sectionLabel}>Pasajeros</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Asientos disponibles"
              value={seats}
              onChangeText={setSeats}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Precio por asiento ($)"
              value={priceS}
              onChangeText={setPriceS}
              keyboardType="numeric"
              placeholder="8000"
            />
          </View>
        </View>

        {/* Encomiendas */}
        <Text style={styles.sectionLabel}>Encomiendas</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Capacidad (kg)"
              value={kg}
              onChangeText={setKg}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Precio por kg ($)"
              value={priceKg}
              onChangeText={setPriceKg}
              keyboardType="numeric"
              placeholder="500"
            />
          </View>
        </View>

        {/* Notas */}
        <Input
          label="Notas (opcional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej: Salgo del centro, paso por la autopista..."
          multiline
          numberOfLines={3}
        />

        {/* Info escrow */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            Los pagos quedan en custodia hasta que confirmés la entrega. LLEVO retiene el {' '}
            <Text style={{ fontWeight: '700' }}>12% de comisión</Text> sobre cada operación.
          </Text>
        </View>

        <Button label="Publicar viaje" onPress={handlePublish} loading={loading} />
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24,
  },
  title:    { color: Colors.white, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: Colors.blueM, fontSize: 14 },

  form: { padding: 16 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  toggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  toggleActive:    { borderColor: Colors.navy, backgroundColor: Colors.blueLight },
  toggleIcon:      { fontSize: 24, marginBottom: 6 },
  toggleText:      { fontSize: 13, fontWeight: '700', color: Colors.gray },
  toggleTextActive:{ color: Colors.navy },
  toggleDesc:      { fontSize: 11, color: Colors.gray, textAlign: 'center', marginTop: 2 },

  row: { flexDirection: 'row', gap: 12 },

  daysRow:    { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  dayBtn:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.grayMid },
  dayBtnActive:{ backgroundColor: Colors.navy, borderColor: Colors.navy },
  dayText:    { fontSize: 12, fontWeight: '700', color: Colors.gray },
  dayTextActive:{ color: Colors.white },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.amberLight, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
})
