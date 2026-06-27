import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../components/app/ScreenSafeArea'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'
import { PhoneField } from '../components/ui/PhoneField'
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, findCountry, type Country } from '../constants/countries'
import { Theme } from '../constants/theme'
import { toE164 } from '../lib/phone'
import { useAuth } from '../lib/auth'

export default function VerifyPhoneScreen() {
  const { sendPhoneCode, verifyMyPhone } = useAuth()
  const [country, setCountry] = useState<Country>(() => findCountry(DEFAULT_COUNTRY_ISO2) ?? COUNTRIES[0])
  const [nationalPhone, setNationalPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSendCode() {
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
      setInfo('Te enviamos un codigo por SMS para confirmar tu telefono.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pude enviar el codigo')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
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
      await verifyMyPhone(e164, code)
      // Vuelve al setup; el gate se destraba solo porque el user ya tiene phoneVerifiedAt.
      router.back()
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'No pude verificar el telefono. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Verificar telefono</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.badge}>
            <Ionicons name="phone-portrait" size={18} color={Theme.colors.black} />
            <Text style={styles.badgeText}>Alta por SMS</Text>
          </View>

          <Text style={styles.title}>Confirma tu numero.</Text>
          <Text style={styles.subtitle}>
            Necesitamos un telefono verificado antes de habilitar la verificacion de conductor con Didit.
          </Text>

          <View style={styles.formCard}>
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

            <Button
              label={codeSent ? 'Verificar codigo' : 'Enviar codigo'}
              onPress={() => void handleVerify()}
              loading={loading}
            />

            {codeSent ? (
              <TouchableOpacity style={styles.secondaryLink} onPress={() => void handleSendCode()}>
                <Text style={styles.secondaryText}>Reenviar codigo</Text>
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
  secondaryLink: {
    alignItems: 'center',
    paddingTop: 12,
  },
  secondaryText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
})
