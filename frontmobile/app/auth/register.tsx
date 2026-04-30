import { useState } from 'react'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { AuthScreenShell } from '../../components/layout/AuthScreenShell'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { theme } from '../../theme'
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
      setError('Completá todos los campos.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await register({ name, email, phone, password })
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreenShell
      eyebrow="Creá tu cuenta"
      title="Sumate a una red confiable para viajar, enviar y cobrar."
      subtitle="Abrí tu perfil en minutos y empezá a publicar rutas o solicitar espacio disponible."
      hero={
        <View style={styles.heroPanel}>
          <View style={styles.heroRow}>
            <View style={styles.heroChip}>
              <Icon name="check-circle" size={15} color={theme.colors.icon.brand} />
              <Text style={styles.heroChipText}>Perfil verificable</Text>
            </View>
            <View style={styles.heroChip}>
              <Icon name="credit-card" size={15} color={theme.colors.icon.brand} />
              <Text style={styles.heroChipText}>Pago protegido</Text>
            </View>
          </View>
          <Text style={styles.heroNote}>
            Tu reputación, tus reseñas y tus operaciones quedan visibles para generar confianza desde el primer viaje.
          </Text>
        </View>
      }
      footer={
        <TouchableOpacity onPress={() => router.replace('/auth/login')} activeOpacity={0.85}>
          <Text style={styles.footerText}>
            ¿Ya tenés cuenta? <Text style={styles.footerLink}>Ingresá</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <Input
        label="Nombre completo"
        value={name}
        onChangeText={setName}
        placeholder="Juan Pérez"
        leadingIcon="user"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leadingIcon="mail"
      />
      <Input
        label="Teléfono"
        value={phone}
        onChangeText={setPhone}
        placeholder="11-1234-5678"
        keyboardType="phone-pad"
        leadingIcon="phone"
      />
      <Input
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        leadingIcon="lock"
        hint="Más adelante vas a poder completar verificación, métodos de cobro y datos del vehículo."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.terms}>
        Al registrarte aceptás los <Text style={styles.termsLink}>Términos y condiciones</Text> y la{' '}
        <Text style={styles.termsLink}>Política de privacidad</Text>.
      </Text>

      <Button
        label="Crear cuenta"
        onPress={handleRegister}
        loading={loading}
        variant="secondary"
        leftIcon="user-plus"
        style={styles.primaryButton}
      />
    </AuthScreenShell>
  )
}

const styles = StyleSheet.create({
  heroPanel: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  heroChipText: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
  },
  heroNote: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.74)',
  },
  error: {
    ...theme.textStyles.caption,
    color: theme.colors.text.danger,
    marginBottom: theme.spacing.sm,
  },
  terms: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  termsLink: {
    color: theme.colors.text.brand,
    fontFamily: theme.fontFamilies.bold,
  },
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  footerText: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.74)',
  },
  footerLink: {
    color: theme.colors.action.accent,
    fontFamily: theme.fontFamilies.bold,
  },
})
