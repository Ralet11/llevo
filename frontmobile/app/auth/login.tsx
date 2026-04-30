import { useState } from 'react'
import { Alert, Text, View, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { AuthScreenShell } from '../../components/layout/AuthScreenShell'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { theme } from '../../theme'
import { useAuth } from '../../lib/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Completá todos los campos.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch {
      setError('Email o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  function handleForgotPassword() {
    Alert.alert(
      'Recuperacion no disponible',
      'Todavia no habilitamos este flujo en mobile. Por ahora, usa otra cuenta de prueba o registrate de nuevo.',
    )
  }

  return (
    <AuthScreenShell
      eyebrow="Entrá al marketplace"
      title="Coordiná viajes y envíos desde una sola app."
      subtitle="Ingresá con tu cuenta para seguir publicando, buscando y gestionando solicitudes."
      hero={
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Icon name="shield" size={16} color={theme.colors.icon.brand} />
            <Text style={styles.heroBadgeText}>Pago protegido</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>+34</Text>
              <Text style={styles.heroStatLabel}>reseñas visibles</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>24h</Text>
              <Text style={styles.heroStatLabel}>respuesta promedio</Text>
            </View>
          </View>
        </View>
      }
      footer={
        <TouchableOpacity onPress={() => router.replace('/auth/register')} activeOpacity={0.85}>
          <Text style={styles.footerText}>
            ¿No tenés cuenta? <Text style={styles.footerLink}>Crearla ahora</Text>
          </Text>
        </TouchableOpacity>
      }
    >
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
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Ingresá tu contraseña"
        secureTextEntry
        leadingIcon="lock"
        hint="Usá la misma cuenta con la que publicaste o solicitaste un viaje."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Ingresar"
        onPress={handleLogin}
        loading={loading}
        variant="secondary"
        leftIcon="log-in"
        style={styles.primaryButton}
      />

      <TouchableOpacity
        style={styles.inlineAction}
        activeOpacity={0.85}
        onPress={handleForgotPassword}
        accessibilityRole="button"
        accessibilityLabel="Recuperar contrasena"
        accessibilityHint="Muestra el estado actual de recuperacion de contrasena."
      >
        <Text style={styles.inlineActionText}>¿Olvidaste tu contraseña?</Text>
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
        rightIcon="arrow-right"
      />
    </AuthScreenShell>
  )
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  heroBadgeText: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    gap: 2,
  },
  heroStatValue: {
    ...theme.textStyles.h3,
    color: theme.colors.text.inverse,
  },
  heroStatLabel: {
    ...theme.textStyles.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: theme.colors.border.inverse,
    marginHorizontal: theme.spacing.md,
  },
  error: {
    ...theme.textStyles.caption,
    color: theme.colors.text.danger,
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  inlineAction: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  inlineActionText: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.default,
  },
  dividerText: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
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
