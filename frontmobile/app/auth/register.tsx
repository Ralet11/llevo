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

export default function RegisterScreen() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    if (!name || !email || !phone || !password) {
      setError('Completa todos los campos')
      return
    }

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }

    setError('')
    setLoading(true)
    try {
      await register({ name, email, phone, password })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ocurrio un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/onboarding')} />
        <Text style={styles.headerTitle}>Crear cuenta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={18} color={Theme.colors.black} />
            <Text style={styles.badgeText}>Perfil verificado, mejores ofertas</Text>
          </View>

          <Text style={styles.title}>Un perfil claro genera mas confianza.</Text>
          <Text style={styles.subtitle}>
            Crea tu cuenta para pedir viajes, enviar paquetes o publicar disponibilidad.
          </Text>

          <View style={styles.formCard}>
            <Input label="Nombre completo" value={name} onChangeText={setName} placeholder="Juan Perez" />
            <Input
              label="Correo electronico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Telefono"
              value={phone}
              onChangeText={setPhone}
              placeholder="11-1234-5678"
              keyboardType="phone-pad"
            />
            <Input
              label="Contrasena"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimo 6 caracteres"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.terms}>
              Al registrarte aceptas los Terminos y condiciones y la Politica de privacidad.
            </Text>

            <Button label="Crear cuenta" onPress={handleRegister} loading={loading} />

            <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/auth/login')}>
              <Text style={styles.loginText}>Ya tenes cuenta? Ingresa</Text>
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
  headerTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
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
  badge: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.lime,
    marginTop: 12,
    marginBottom: 24,
  },
  badgeText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
  },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 31,
    lineHeight: 34,
    letterSpacing: -0.9,
  },
  subtitle: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 20,
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
  terms: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 14,
  },
  loginLink: {
    alignItems: 'center',
    paddingTop: 14,
  },
  loginText: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 13,
  },
})
