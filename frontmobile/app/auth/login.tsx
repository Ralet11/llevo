import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Completa email y contrasena')
      return
    }

    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pude iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/onboarding')} />
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Ionicons name="navigate" size={15} color={Theme.colors.black} />
          </View>
          <Text style={styles.logo}>LLEVO</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroGrid} />

            <View style={styles.tripBadge}>
              <Ionicons name="navigate-circle" size={16} color={Theme.colors.black} />
              <Text style={styles.tripBadgeText}>Viajes activos</Text>
            </View>

            <View style={styles.routeCard}>
              <View style={styles.routeStop}>
                <View style={styles.routeStopIcon}>
                  <Ionicons name="location" size={14} color={Theme.colors.black} />
                </View>
                <View style={styles.routeStopCopy}>
                  <Text style={styles.routeStopLabel}>Salida</Text>
                  <Text style={styles.routeStopValue}>Caballito</Text>
                </View>
              </View>

              <View style={styles.routeConnector}>
                <View style={styles.routeConnectorDot} />
                <View style={styles.routeConnectorLine} />
                <View style={styles.routeConnectorDot} />
              </View>

              <View style={styles.routeStop}>
                <View style={[styles.routeStopIcon, styles.routeStopIconAlt]}>
                  <Ionicons name="flag" size={13} color={Theme.colors.black} />
                </View>
                <View style={styles.routeStopCopy}>
                  <Text style={styles.routeStopLabel}>Destino</Text>
                  <Text style={styles.routeStopValue}>Microcentro</Text>
                </View>
              </View>
            </View>

            <View style={styles.roadBand}>
              <View style={styles.roadLane} />
              <View style={styles.roadLaneShort} />
              <View style={styles.roadLaneShort} />
            </View>

            <View style={styles.carCardSecondary}>
              <Ionicons name="car-sport" size={24} color={Theme.colors.black} />
              <View style={styles.carWheels}>
                <View style={styles.carWheel} />
                <View style={styles.carWheel} />
              </View>
            </View>

            <View style={styles.carCardPrimary}>
              <View style={styles.carCardHeader}>
                <Text style={styles.carCardTitle}>Auto disponible</Text>
                <Ionicons name="arrow-forward" size={14} color={Theme.colors.black} />
              </View>
              <Ionicons name="car-sport" size={38} color={Theme.colors.black} />
              <View style={styles.carMetaRow}>
                <Text style={styles.carMetaPill}>4 asientos</Text>
                <Text style={styles.carMetaPill}>Llega en 6 min</Text>
              </View>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Ingresa y pedi tu proximo movimiento.</Text>
            <Text style={styles.subtitle}>Mapa, viajes, entregas y perfil bajo una misma experiencia segura.</Text>
          </View>

          <View style={styles.formCard}>
            <Input
              label="Correo electronico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Contrasena"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimo 6 caracteres"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.devHint}>Usa una cuenta registrada en tu backend local o crea una desde la pantalla de registro.</Text>

            <Button label="Ingresar" onPress={handleLogin} loading={loading} style={styles.submit} />

            <TouchableOpacity style={styles.registerLink} onPress={() => router.replace('/auth/register')}>
              <Text style={styles.registerText}>No tenes cuenta? Crear una</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: 17,
  },
  headerSpacer: {
    width: 46,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  heroCard: {
    height: 190,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Theme.colors.lime,
    marginTop: 8,
    marginBottom: 24,
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -78,
    top: -94,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroGrid: {
    position: 'absolute',
    inset: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(5,5,5,0.08)',
  },
  tripBadge: {
    position: 'absolute',
    left: 18,
    top: 18,
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.white,
    borderWidth: 2,
    borderColor: Theme.colors.black,
  },
  tripBadgeText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  routeCard: {
    position: 'absolute',
    left: 20,
    top: 64,
    width: 122,
    padding: 12,
    borderRadius: 22,
    backgroundColor: Theme.colors.white,
    borderWidth: 3,
    borderColor: Theme.colors.black,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeStopIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    color: 'rgba(5,5,5,0.55)',
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeStopValue: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
    marginTop: 2,
  },
  routeConnector: {
    marginLeft: 13,
    marginVertical: 8,
    width: 2,
    alignItems: 'center',
  },
  routeConnectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.black,
  },
  routeConnectorLine: {
    width: 2,
    height: 18,
    marginVertical: 3,
    backgroundColor: 'rgba(5,5,5,0.28)',
  },
  roadBand: {
    position: 'absolute',
    left: -18,
    right: -10,
    bottom: 30,
    height: 44,
    borderRadius: 24,
    paddingHorizontal: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.black,
    transform: [{ rotate: '-8deg' }],
  },
  roadLane: {
    width: 92,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.lime,
  },
  roadLaneShort: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.lime,
  },
  carCardSecondary: {
    position: 'absolute',
    right: 90,
    bottom: 52,
    width: 88,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5D6',
    borderWidth: 3,
    borderColor: Theme.colors.black,
    transform: [{ rotate: '-9deg' }],
  },
  carCardPrimary: {
    position: 'absolute',
    right: 18,
    top: 54,
    width: 150,
    padding: 14,
    borderRadius: 24,
    backgroundColor: Theme.colors.white,
    borderWidth: 3,
    borderColor: Theme.colors.black,
    transform: [{ rotate: '4deg' }],
  },
  carCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  carCardTitle: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  carMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  carMetaPill: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Theme.colors.limeSoft,
  },
  carWheels: {
    position: 'absolute',
    bottom: 9,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carWheel: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Theme.colors.black,
  },
  copy: {
    marginBottom: 18,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  formCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  error: {
    color: Theme.colors.danger,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  devHint: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  submit: {
    marginTop: 2,
  },
  registerLink: {
    alignItems: 'center',
    paddingTop: 14,
  },
  registerText: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
})
