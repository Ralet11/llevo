import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../constants/colors'
import { Button } from '../components/ui/Button'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    icon: '🚗',
    title: 'Viajás entre ciudades?',
    desc: 'Publicá tu viaje, compartí el costo y generá ingresos extra llevando pasajeros o paquetes.',
    bg: Colors.navy,
  },
  {
    icon: '📦',
    title: 'Necesitás enviar algo?',
    desc: 'Encontrá viajeros que ya van para donde necesitás. Más rápido y barato que el correo.',
    bg: Colors.navyLight,
  },
  {
    icon: '🔒',
    title: 'Seguro y con pago protegido',
    desc: 'El dinero queda en custodia hasta que todo llegue bien. Calificaciones reales, personas verificadas.',
    bg: Colors.navyXLight,
  },
]

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0)

  function next() {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1)
    } else {
      router.replace('/auth/register')
    }
  }

  const slide = SLIDES[current]

  return (
    <View style={[styles.container, { backgroundColor: slide.bg }]}>
      {/* Skip */}
      <TouchableOpacity style={styles.skip} onPress={() => router.replace('/auth/login')}>
        <Text style={styles.skipText}>Omitir</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={current < SLIDES.length - 1 ? 'Siguiente' : 'Empezar'}
          onPress={next}
          variant="primary"
        />
        {current === SLIDES.length - 1 && (
          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/auth/login')}>
            <Text style={styles.loginLinkText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  skip:       { alignSelf: 'flex-end' },
  skipText:   { color: Colors.blueM, fontSize: 14 },

  content:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon:       { fontSize: 80, marginBottom: 32 },
  title:      { fontSize: 28, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 16 },
  desc:       { fontSize: 16, color: Colors.blueM, textAlign: 'center', lineHeight: 24 },

  dots:       { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.navyXLight },
  dotActive:  { backgroundColor: Colors.amber, width: 24 },

  actions:    { gap: 12 },
  loginLink:  { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { color: Colors.blueM, fontSize: 14 },
})
