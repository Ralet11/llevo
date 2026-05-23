import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../components/app/ScreenSafeArea'
import { Button } from '../components/ui/Button'
import { Theme } from '../constants/theme'

export default function OnboardingScreen() {
  function showPendingProvider() {
    Alert.alert('Disponible pronto', 'Telefono y Google se activaran cuando conectemos los proveedores reales.')
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Ionicons name="navigate" size={16} color={Theme.colors.black} />
        </View>
        <Text style={styles.logo}>LLEVO</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.shield}>
          <View style={[styles.personCard, styles.personLeft]}>
            <View style={styles.face} />
            <View style={styles.bodyLine} />
            <View style={styles.bodyLineShort} />
          </View>
          <View style={styles.checkCard}>
            <Ionicons name="checkmark" size={34} color={Theme.colors.black} />
          </View>
          <View style={[styles.personCard, styles.personRight]}>
            <View style={styles.face} />
            <View style={styles.bodyLine} />
            <View style={styles.bodyLineShort} />
          </View>
          <View style={styles.handshake}>
            <Ionicons name="shield-checkmark" size={28} color={Theme.colors.black} />
          </View>
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>Elegi tu viaje. Seguro y claro.</Text>
        <Text style={styles.description}>
          Define tus condiciones, mira opciones cercanas y avanza solo con personas verificadas.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Continuar con email" onPress={() => router.replace('/auth/login')} />
        <TouchableOpacity activeOpacity={0.82} style={styles.googleButton} onPress={showPendingProvider}>
          <Ionicons name="logo-google" size={18} color={Theme.colors.text} />
          <Text style={styles.googleText}>Continuar con Google</Text>
          <Text style={styles.pending}>Pronto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerLink} onPress={() => router.replace('/auth/register')}>
          <Text style={styles.registerText}>Crear cuenta nueva</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.terms}>
        Al unirte aceptas nuestros Terminos de uso y Politica de privacidad.
      </Text>
    </ScreenSafeArea>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
  },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  logo: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  shield: {
    width: 270,
    height: 240,
    borderTopLeftRadius: 130,
    borderTopRightRadius: 130,
    borderBottomLeftRadius: 52,
    borderBottomRightRadius: 52,
    backgroundColor: Theme.colors.lime,
    overflow: 'hidden',
    transform: [{ rotate: '-4deg' }],
  },
  personCard: {
    position: 'absolute',
    width: 98,
    height: 138,
    borderRadius: 24,
    backgroundColor: '#F4F4F4',
    borderWidth: 3,
    borderColor: Theme.colors.black,
    padding: 16,
  },
  personLeft: {
    left: 30,
    top: 76,
    transform: [{ rotate: '10deg' }],
  },
  personRight: {
    right: 30,
    top: 76,
    transform: [{ rotate: '-10deg' }],
  },
  face: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.black,
    marginBottom: 16,
  },
  bodyLine: {
    width: 56,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.black,
    marginBottom: 8,
  },
  bodyLineShort: {
    width: 42,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.black,
  },
  checkCard: {
    position: 'absolute',
    top: 76,
    left: 106,
    width: 58,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
    borderWidth: 4,
    borderColor: Theme.colors.black,
    zIndex: 4,
  },
  handshake: {
    position: 'absolute',
    bottom: 28,
    left: 99,
    width: 72,
    height: 46,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
    borderWidth: 4,
    borderColor: Theme.colors.black,
    zIndex: 5,
  },
  copy: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 28,
    lineHeight: 31,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  description: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  actions: {
    gap: 10,
  },
  googleButton: {
    minHeight: 50,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  googleText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  pending: {
    position: 'absolute',
    right: 14,
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 11,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerText: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
  terms: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 10,
  },
})
