import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { PhoneField } from '../../components/ui/PhoneField'
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, findCountry, type Country } from '../../constants/countries'
import { Theme } from '../../constants/theme'
import { toE164 } from '../../lib/phone'
import { useAuth } from '../../lib/auth'

export default function RegisterScreen() {
  const { registerWithPhone, sendPhoneCode } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<Country>(() => findCountry(DEFAULT_COUNTRY_ISO2) ?? COUNTRIES[0])
  const [nationalPhone, setNationalPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSendCode() {
    if (!name.trim()) {
      setError('Completá tu nombre')
      return
    }
    const e164 = toE164(nationalPhone, country.iso2)
    if (!e164) {
      setError('Ingresá un teléfono válido')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      await sendPhoneCode(e164, 'register')
      setCodeSent(true)
      setInfo('Te enviamos un codigo para confirmar tu telefono.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pude enviar el codigo')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    if (!name.trim()) {
      setError('Completá tu nombre')
      return
    }
    const e164 = toE164(nationalPhone, country.iso2)
    if (!e164) {
      setError('Ingresá un teléfono válido')
      return
    }

    if (!codeSent) {
      await handleSendCode()
      return
    }

    if (!code.trim()) {
      setError('Ingresa el codigo recibido')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      await registerWithPhone({
        name,
        phone: e164,
        code,
        email: email.trim() || undefined,
      })
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Ocurrio un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace('/onboarding')} />
        <Text style={styles.headerTitle}>Crear cuenta con telefono</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.badge}>
            <Ionicons name="phone-portrait" size={18} color={Theme.colors.black} />
            <Text style={styles.badgeText}>Alta con telefono verificado</Text>
          </View>

          <Text style={styles.title}>Tu numero pasa a ser la llave principal.</Text>
          <Text style={styles.subtitle}>
            Creamos la cuenta con OTP por SMS. El email queda opcional para contacto y recuperos futuros.
          </Text>

          <View style={styles.formCard}>
            <Input label="Nombre completo" value={name} onChangeText={setName} placeholder="Juan Perez" />
            <PhoneField
              label="Teléfono"
              country={country}
              onChangeCountry={setCountry}
              national={nationalPhone}
              onChangeNational={value => {
                setNationalPhone(value)
                setError('')
                setInfo('')
              }}
            />
            <Input
              label="Correo electronico (opcional)"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {codeSent ? (
              <Input
                label="Codigo SMS"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            ) : null}

            {info ? <Text style={styles.info}>{info}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.terms}>
              Al registrarte aceptas los Terminos y condiciones y la Politica de privacidad.
            </Text>

            <Button
              label={codeSent ? 'Crear cuenta con codigo' : 'Enviar codigo'}
              onPress={() => void handleRegister()}
              loading={loading}
            />

            {codeSent ? (
              <TouchableOpacity style={styles.secondaryLink} onPress={() => void handleSendCode()}>
                <Text style={styles.secondaryText}>Reenviar codigo</Text>
              </TouchableOpacity>
            ) : null}

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
  info: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
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
  secondaryLink: {
    alignItems: 'center',
    paddingTop: 12,
  },
  secondaryText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
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
