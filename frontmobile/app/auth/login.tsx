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

type LoginMethod = 'phone' | 'email'
type EmailStep = 'email' | 'password' | 'code' | 'setPassword'

export default function LoginScreen() {
  const { login, sendPhoneCode, loginWithPhone, startEmailAuth, verifyEmailCode, setEmailPassword } = useAuth()
  const [method, setMethod] = useState<LoginMethod>('phone')
  const [country, setCountry] = useState<Country>(() => findCountry(DEFAULT_COUNTRY_ISO2) ?? COUNTRIES[0])
  const [nationalPhone, setNationalPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailStep, setEmailStep] = useState<EmailStep>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function resetEmailFlow(nextEmail = '') {
    setEmail(nextEmail)
    setPassword('')
    setConfirmPassword('')
    setCode('')
    setEmailStep('email')
  }

  function switchMethod(nextMethod: LoginMethod) {
    setMethod(nextMethod)
    setError('')
    setInfo('')

    if (nextMethod === 'phone') {
      resetEmailFlow(email)
      return
    }

    setNationalPhone('')
    setCode('')
    setCodeSent(false)
  }

  async function handlePhoneCodeRequest() {
    const e164 = toE164(nationalPhone, country.iso2)
    if (!e164) {
      setError('Ingresá un teléfono válido')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      await sendPhoneCode(e164, 'login')
      setCodeSent(true)
      setInfo('Te enviamos un código por SMS.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pude enviar el código')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneLogin() {
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const e164 = toE164(nationalPhone, country.iso2)
      if (!e164) throw new Error('Ingresá un teléfono válido')
      if (!codeSent) {
        await sendPhoneCode(e164, 'login')
        setCodeSent(true)
        setInfo('Te enviamos un código por SMS.')
        return
      }
      if (!code.trim()) throw new Error('Ingresa el código recibido')
      await loginWithPhone(e164, code)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No pude iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailFlow() {
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (!email.trim()) throw new Error('Completa tu email')

      if (emailStep === 'email') {
        const response = await startEmailAuth(email)
        if (response.nextStep === 'password') {
          setEmailStep('password')
          setInfo('Esta cuenta ya tiene contraseña. Ingresa para continuar.')
        } else {
          setEmailStep('code')
          setInfo(
            response.devCode
              ? `Te enviamos un código por email. Desarrollo: ${response.devCode}`
              : 'Te enviamos un código por email.'
          )
        }
        return
      }

      if (emailStep === 'password') {
        if (!password) throw new Error('Ingresa tu contraseña')
        await login(email, password)
        return
      }

      if (emailStep === 'code') {
        if (!code.trim()) throw new Error('Ingresa el código recibido')
        await verifyEmailCode(email, code)
        setEmailStep('setPassword')
        setInfo('Código verificado. Ahora elige tu contraseña.')
        return
      }

      if (!password || !confirmPassword) {
        throw new Error('Completa y confirma tu contraseña')
      }
      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }

      await setEmailPassword(email, code, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No pude continuar con email')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailResendCode() {
    if (!email.trim()) {
      setError('Completa tu email')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      const response = await startEmailAuth(email)
      if (response.nextStep !== 'code') {
        setEmailStep('password')
        setInfo('Esta cuenta ya tiene contraseña. Ingresa para continuar.')
        return
      }

      setEmailStep('code')
      setInfo(
        response.devCode
          ? `Te enviamos un código nuevo por email. Desarrollo: ${response.devCode}`
          : 'Te enviamos un código nuevo por email.'
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pude reenviar el código')
    } finally {
      setLoading(false)
    }
  }

  function renderEmailFields() {
    return (
      <>
        {emailStep !== 'setPassword' ? (
          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={value => {
              setEmail(value)
              setError('')
              setInfo('')
            }}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : null}

        {emailStep === 'password' ? (
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            secureTextEntry
          />
        ) : null}

        {emailStep === 'code' ? (
          <Input
            label="Código por email"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            autoCapitalize="none"
          />
        ) : null}

        {emailStep === 'setPassword' ? (
          <>
            <Text style={styles.emailSummary}>Activando acceso para {email}</Text>
            <Input
              label="Elige una contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
            />
            <Input
              label="Confirma tu contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite la contraseña"
              secureTextEntry
            />
          </>
        ) : null}

        {info ? <Text style={styles.info}>{info}</Text> : null}

        <Button
          label={
            emailStep === 'email'
              ? 'Continuar con email'
              : emailStep === 'password'
                ? 'Ingresar'
                : emailStep === 'code'
                  ? 'Validar código'
                  : 'Guardar contraseña'
          }
          onPress={() => void handleEmailFlow()}
          loading={loading}
          style={styles.submit}
        />

        {emailStep === 'code' ? (
          <TouchableOpacity style={styles.secondaryLink} onPress={() => void handleEmailResendCode()}>
            <Text style={styles.secondaryText}>Reenviar código</Text>
          </TouchableOpacity>
        ) : null}

        {emailStep !== 'email' ? (
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => {
              resetEmailFlow(email)
              setInfo('')
              setError('')
            }}
          >
            <Text style={styles.secondaryText}>Usar otro camino</Text>
          </TouchableOpacity>
        ) : null}
      </>
    )
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
              <Ionicons name="shield-checkmark" size={16} color={Theme.colors.black} />
              <Text style={styles.tripBadgeText}>Ingreso seguro</Text>
            </View>

            <View style={styles.routeCard}>
              <Text style={styles.routeStopLabel}>Acceso flexible</Text>
              <Text style={styles.routeStopValue}>{method === 'phone' ? 'Teléfono con código' : 'Email inteligente'}</Text>
              <Text style={styles.heroSmallCopy}>
                {method === 'phone'
                  ? 'Twilio Verify habilita el ingreso sin contraseña.'
                  : 'Primero vemos si tu email ya tiene contraseña o si debemos activarlo.'}
              </Text>
            </View>

            <View style={styles.roadBand}>
              <View style={styles.roadLane} />
              <View style={styles.roadLaneShort} />
              <View style={styles.roadLaneShort} />
            </View>

            <View style={styles.carCardPrimary}>
              <View style={styles.carCardHeader}>
                <Text style={styles.carCardTitle}>Tu cuenta</Text>
                <Ionicons name={method === 'phone' ? 'phone-portrait' : 'mail'} size={14} color={Theme.colors.black} />
              </View>
              <Ionicons name={method === 'phone' ? 'chatbubble-ellipses' : 'mail-open'} size={38} color={Theme.colors.black} />
              <View style={styles.carMetaRow}>
                <Text style={styles.carMetaPill}>SMS OTP</Text>
                <Text style={styles.carMetaPill}>Email + clave</Text>
              </View>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Ingresa o activa tu cuenta en segundos.</Text>
            <Text style={styles.subtitle}>
              Con teléfono seguimos igual. Con email primero revisamos si ya tienes contraseña; si no, te enviamos un código y la configuras en el momento.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodChip, method === 'phone' && styles.methodChipActive]}
                activeOpacity={0.85}
                onPress={() => switchMethod('phone')}
              >
                <Text style={[styles.methodChipText, method === 'phone' && styles.methodChipTextActive]}>
                  Teléfono
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodChip, method === 'email' && styles.methodChipActive]}
                activeOpacity={0.85}
                onPress={() => switchMethod('email')}
              >
                <Text style={[styles.methodChipText, method === 'email' && styles.methodChipTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {method === 'phone' ? (
              <>
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
                {codeSent ? (
                  <Input
                    label="Código SMS"
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                ) : null}

                {info ? <Text style={styles.info}>{info}</Text> : null}

                <Button
                  label={codeSent ? 'Ingresar con código' : 'Enviar código'}
                  onPress={() => void handlePhoneLogin()}
                  loading={loading}
                  style={styles.submit}
                />

                {codeSent ? (
                  <TouchableOpacity style={styles.secondaryLink} onPress={() => void handlePhoneCodeRequest()}>
                    <Text style={styles.secondaryText}>Reenviar código</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              renderEmailFields()
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {method === 'email' ? (
              <TouchableOpacity style={styles.registerLink} onPress={() => router.replace('/auth/register')}>
                <Text style={styles.registerText}>¿Prefieres crear cuenta con teléfono?</Text>
              </TouchableOpacity>
            ) : null}
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
    top: 66,
    width: 146,
    padding: 14,
    borderRadius: 22,
    backgroundColor: Theme.colors.white,
    borderWidth: 3,
    borderColor: Theme.colors.black,
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
    fontSize: 15,
    marginTop: 4,
  },
  heroSmallCopy: {
    color: 'rgba(5,5,5,0.68)',
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
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
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  methodChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  methodChipActive: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
  methodChipText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
  methodChipTextActive: {
    color: Theme.colors.black,
  },
  info: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  emailSummary: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  error: {
    color: Theme.colors.danger,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  submit: {
    marginTop: 2,
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
