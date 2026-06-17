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

type LoginMethod = 'phone' | 'email'

export default function LoginScreen() {
  const { login, sendPhoneCode, loginWithPhone } = useAuth()
  const [method, setMethod] = useState<LoginMethod>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handlePhoneCodeRequest() {
    if (!phone.trim()) {
      setError('Completa tu telefono')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      await sendPhoneCode(phone, 'login')
      setCodeSent(true)
      setInfo('Te enviamos un codigo por SMS.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pude enviar el codigo')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (method === 'phone') {
        if (!phone.trim()) throw new Error('Completa tu telefono')
        if (!codeSent) {
          await sendPhoneCode(phone, 'login')
          setCodeSent(true)
          setInfo('Te enviamos un codigo por SMS.')
          return
        }
        if (!code.trim()) throw new Error('Ingresa el codigo recibido')
        await loginWithPhone(phone, code)
        return
      }

      if (!email || !password) throw new Error('Completa email y contrasena')
      await login(email, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No pude iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  function switchMethod(nextMethod: LoginMethod) {
    setMethod(nextMethod)
    setError('')
    setInfo('')
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
              <Text style={styles.routeStopLabel}>Acceso principal</Text>
              <Text style={styles.routeStopValue}>Telefono con codigo</Text>
              <Text style={styles.heroSmallCopy}>Twilio Verify habilita el ingreso sin contrasena.</Text>
            </View>

            <View style={styles.roadBand}>
              <View style={styles.roadLane} />
              <View style={styles.roadLaneShort} />
              <View style={styles.roadLaneShort} />
            </View>

            <View style={styles.carCardPrimary}>
              <View style={styles.carCardHeader}>
                <Text style={styles.carCardTitle}>Tu cuenta</Text>
                <Ionicons name="phone-portrait" size={14} color={Theme.colors.black} />
              </View>
              <Ionicons name="chatbubble-ellipses" size={38} color={Theme.colors.black} />
              <View style={styles.carMetaRow}>
                <Text style={styles.carMetaPill}>SMS OTP</Text>
                <Text style={styles.carMetaPill}>Email legado</Text>
              </View>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Ingresa o creá tu cuenta en segundos.</Text>
            <Text style={styles.subtitle}>Ingresá tu telefono, te mandamos un codigo y listo. Si no tenés cuenta la creamos automáticamente.</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodChip, method === 'phone' && styles.methodChipActive]}
                activeOpacity={0.85}
                onPress={() => switchMethod('phone')}
              >
                <Text style={[styles.methodChipText, method === 'phone' && styles.methodChipTextActive]}>
                  Telefono
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
                <Input
                  label="Telefono"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+5491112345678"
                  keyboardType="phone-pad"
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

                <Button
                  label={codeSent ? 'Ingresar con codigo' : 'Enviar codigo'}
                  onPress={() => void handleLogin()}
                  loading={loading}
                  style={styles.submit}
                />

                {codeSent ? (
                  <TouchableOpacity style={styles.secondaryLink} onPress={() => void handlePhoneCodeRequest()}>
                    <Text style={styles.secondaryText}>Reenviar codigo</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
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

                <Button label="Ingresar" onPress={() => void handleLogin()} loading={loading} style={styles.submit} />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {method === 'email' && (
              <TouchableOpacity style={styles.registerLink} onPress={() => router.replace('/auth/register')}>
                <Text style={styles.registerText}>No tenes cuenta? Crear una</Text>
              </TouchableOpacity>
            )}
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
