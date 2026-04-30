import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../lib/auth'

export default function RegisterScreen() {
  const { register } = useAuth()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleRegister() {
    if (!name || !email || !phone || !password) { setError('Completá todos los campos'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError(''); setLoading(true)
    try {
      await register({ name, email, phone, password })
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>LLEVO</Text>
        <Text style={styles.subtitle}>Creá tu cuenta gratis</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Input label="Nombre completo" value={name} onChangeText={setName} placeholder="Juan Pérez" />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            placeholder="11-1234-5678"
            keyboardType="phone-pad"
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.terms}>
            Al registrarte aceptás los{' '}
            <Text style={styles.link}>Términos y condiciones</Text>
            {' '}y la{' '}
            <Text style={styles.link}>Política de privacidad</Text>.
          </Text>

          <Button label="Crear cuenta" onPress={handleRegister} loading={loading} style={{ marginTop: 8 }} />

          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/auth/login')}>
            <Text style={styles.loginText}>¿Ya tenés cuenta? <Text style={styles.link}>Ingresá</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: {
    paddingTop: 80, paddingHorizontal: 28, paddingBottom: 32,
    alignItems: 'center',
  },
  logo:     { fontSize: 40, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: Colors.blueM, marginTop: 6 },
  form: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32,
  },
  error:     { color: Colors.red, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  terms:     { fontSize: 12, color: Colors.gray, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  link:      { color: Colors.navyLight, fontWeight: '600' },
  loginLink: { alignItems: 'center', paddingVertical: 14 },
  loginText: { color: Colors.gray, fontSize: 14 },
})
