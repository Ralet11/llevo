import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../lib/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!email || !password) { setError('Completá todos los campos'); return }
    setError(''); setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>LLEVO</Text>
        <Text style={styles.subtitle}>Ingresá a tu cuenta</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Ingresar" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />

          <TouchableOpacity style={styles.forgotLink}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label="Crear cuenta nueva"
            onPress={() => router.replace('/auth/register')}
            variant="outline"
          />
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

  error:      { color: Colors.red, fontSize: 13, marginBottom: 12, textAlign: 'center' },

  forgotLink:  { alignItems: 'center', paddingVertical: 14 },
  forgotText:  { color: Colors.navyLight, fontSize: 14 },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.grayMid },
  dividerText: { color: Colors.gray, fontSize: 13 },
})
