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
          <View style={styles.heroGlow} />

          <View style={styles.routeBadge}>
            <Ionicons name="navigate-circle" size={18} color={Theme.colors.black} />
            <Text style={styles.routeBadgeText}>Viajes</Text>
          </View>

          <View style={[styles.tripCard, styles.tripCardLeft]}>
            <View style={styles.tripCardIconWrap}>
              <Ionicons name="car-sport" size={28} color={Theme.colors.black} />
            </View>
            <View style={styles.tripCardLines}>
              <View style={styles.tripCardLine} />
              <View style={styles.tripCardLineShort} />
            </View>
          </View>

          <View style={[styles.tripCard, styles.tripCardRight]}>
            <View style={styles.tripCardIconWrap}>
              <Ionicons name="car-sport" size={28} color={Theme.colors.black} />
            </View>
            <View style={styles.tripCardLines}>
              <View style={styles.tripCardLine} />
              <View style={styles.tripCardLineShort} />
            </View>
          </View>

          <View style={styles.road}>
            <View style={styles.roadDashLong} />
            <View style={styles.roadDash} />
            <View style={styles.roadDash} />
          </View>

          <View style={styles.routeSummary}>
            <View style={styles.routeStopRow}>
              <View style={styles.routeStopIcon}>
                <Ionicons name="location" size={14} color={Theme.colors.black} />
              </View>
              <View style={styles.routeStopCopy}>
                <Text style={styles.routeStopLabel}>Salida</Text>
                <Text style={styles.routeStopValue}>Ciudad</Text>
              </View>
            </View>

            <View style={styles.routeConnector}>
              <View style={styles.routeConnectorDot} />
              <View style={styles.routeConnectorLine} />
              <View style={styles.routeConnectorDot} />
            </View>

            <View style={styles.routeStopRow}>
              <View style={[styles.routeStopIcon, styles.routeStopIconAlt]}>
                <Ionicons name="flag" size={13} color={Theme.colors.black} />
              </View>
              <View style={styles.routeStopCopy}>
                <Text style={styles.routeStopLabel}>Destino</Text>
                <Text style={styles.routeStopValue}>Tu viaje</Text>
              </View>
            </View>
          </View>

          <View style={styles.tripCheck}>
            <Ionicons name="checkmark" size={22} color={Theme.colors.black} />
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
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -54,
    top: -52,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  routeBadge: {
    position: 'absolute',
    top: 24,
    left: 92,
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F4F4',
    borderWidth: 3,
    borderColor: Theme.colors.black,
    zIndex: 4,
  },
  routeBadgeText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  tripCard: {
    position: 'absolute',
    width: 92,
    height: 124,
    borderRadius: 24,
    padding: 14,
    backgroundColor: '#F4F4F4',
    borderWidth: 3,
    borderColor: Theme.colors.black,
    justifyContent: 'space-between',
  },
  tripCardLeft: {
    left: 34,
    top: 82,
    transform: [{ rotate: '6deg' }],
  },
  tripCardRight: {
    right: 34,
    top: 78,
    transform: [{ rotate: '-10deg' }],
  },
  tripCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.limeSoft,
  },
  tripCardLines: {
    gap: 8,
  },
  tripCardLine: {
    width: 48,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.colors.black,
  },
  tripCardLineShort: {
    width: 34,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.colors.black,
  },
  road: {
    position: 'absolute',
    left: -12,
    right: -12,
    bottom: 34,
    height: 38,
    borderRadius: 20,
    paddingHorizontal: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.black,
    transform: [{ rotate: '-7deg' }],
  },
  roadDashLong: {
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.lime,
  },
  roadDash: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.lime,
  },
  routeSummary: {
    position: 'absolute',
    left: 94,
    top: 110,
    width: 86,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F4F4F4',
    borderWidth: 3,
    borderColor: Theme.colors.black,
    zIndex: 5,
  },
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeStopIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  routeStopIconAlt: {
    backgroundColor: Theme.colors.limeSoft,
  },
  routeStopCopy: {
    flex: 1,
  },
  routeStopLabel: {
    color: 'rgba(5,5,5,0.58)',
    fontFamily: Theme.fonts.bold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeStopValue: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    marginTop: 2,
  },
  routeConnector: {
    marginLeft: 11,
    marginVertical: 8,
    width: 2,
    alignItems: 'center',
  },
  routeConnectorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Theme.colors.black,
  },
  routeConnectorLine: {
    width: 2,
    height: 14,
    marginVertical: 3,
    backgroundColor: 'rgba(5,5,5,0.28)',
  },
  tripCheck: {
    position: 'absolute',
    bottom: 22,
    left: 112,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
    borderWidth: 4,
    borderColor: Theme.colors.black,
    zIndex: 6,
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
