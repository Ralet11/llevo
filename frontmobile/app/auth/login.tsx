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
    } catch {
      setError('Email o contrasena incorrectos')
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
            <View style={styles.orbit} />
            <View style={styles.mapPin}>
              <Ionicons name="location" size={30} color={Theme.colors.black} />
            </View>
            <View style={styles.routeLine} />
            <View style={styles.driverBubble}>
              <Ionicons name="car-sport" size={22} color={Theme.colors.black} />
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

            <Text style={styles.devHint}>Durante desarrollo, cualquier email y contrasena valida inicia sesion.</Text>

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
  orbit: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 2,
    borderColor: 'rgba(5,5,5,0.18)',
    right: -56,
    top: -42,
  },
  mapPin: {
    position: 'absolute',
    left: 34,
    top: 42,
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 4,
    borderColor: Theme.colors.black,
  },
  routeLine: {
    position: 'absolute',
    left: 88,
    top: 92,
    width: 130,
    height: 5,
    borderRadius: 3,
    backgroundColor: Theme.colors.black,
    transform: [{ rotate: '-12deg' }],
  },
  driverBubble: {
    position: 'absolute',
    right: 34,
    bottom: 36,
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 4,
    borderColor: Theme.colors.black,
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
