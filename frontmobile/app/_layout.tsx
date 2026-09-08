import React, { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, Image, Platform, Pressable, Text } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { AuthProvider, useAuth } from '../lib/auth'
import { api, assertInternalReleaseBackend } from '../lib/api'
import { Theme } from '../constants/theme'
import { ThemeProvider, useTheme } from '../lib/theme'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

SplashScreen.preventAutoHideAsync().catch(() => {})

function EnvironmentGate({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'checking' | 'ready' | 'blocked'>('checking')

  useEffect(() => {
    let active = true
    setStatus('checking')
    assertInternalReleaseBackend()
      .then(() => { if (active) setStatus('ready') })
      .catch(() => { if (active) setStatus('blocked') })
    return () => { active = false }
  }, [attempt])

  if (status === 'ready') return children

  return (
    <View style={{ flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.background }}>
      {status === 'checking' ? (
        <ActivityIndicator color={Theme.colors.lime} size="large" />
      ) : (
        <>
          <Text style={{ color: Theme.colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Entorno de pruebas no habilitado</Text>
          <Text style={{ color: Theme.colors.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 21 }}>
            Esta build solo funciona con el backend interno y pagos simulados. Avisá al responsable del piloto o reintentá cuando termine el despliegue.
          </Text>
          <Pressable onPress={() => setAttempt(value => value + 1)} style={{ marginTop: 24, backgroundColor: Theme.colors.lime, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 13 }}>
            <Text style={{ color: '#06101F', fontWeight: '800' }}>Reintentar</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

async function registerPushToken(token: string) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  const pushToken = await Notifications.getExpoPushTokenAsync()
  await api.post('/auth/push-token', { pushToken: pushToken.data }, token).catch(() => {})
}

function RootNavigator() {
  const { user, token, isLoading } = useAuth()
  const segments = useSegments()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { palette, paletteName } = useTheme()

  useEffect(() => {
    if (user && token) {
      registerPushToken(token).catch(() => {})
    }
  }, [user, token])

  useEffect(() => {
    if (isLoading) return
    const currentSegments = segments as unknown as string[]
    const inAuth    = currentSegments[0] === 'auth'
    const inOnboard = currentSegments[0] === 'onboarding'
    const atRoot    = currentSegments.length === 0
    if (currentSegments[0] === 'auth' && currentSegments[1] === 'register') {
      router.replace('/auth/login')
      return
    }
    if (!user && !inAuth && !inOnboard) {
      router.replace('/onboarding')
    } else if (user && (inAuth || inOnboard || atRoot)) {
      router.replace('/(app)')
    } else if (user && (currentSegments[0] === '(tabs)' || currentSegments[0] === 'trip')) {
      router.replace('/(app)/travel')
    }
  }, [user, isLoading, router, segments])

  if (isLoading || (segments as string[])[0] === '(tabs)' || (segments as string[])[0] === 'trip') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.colors.background }}>
        <ActivityIndicator color={palette.colors.lime} size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.colors.background }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack key={paletteName} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="trip/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Detalle del viaje',
            headerStyle: { backgroundColor: palette.colors.background },
            headerTintColor: palette.colors.text,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
      <View pointerEvents="none" style={{ backgroundColor: '#14392B', padding: 5 }}>
        <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 12 }}>Pruebas internas · Sin cobros reales</Text>
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: palette.colors.background,
          zIndex: 1000,
          elevation: 1000,
        }}
      />
    </View>
  )
}

export default function RootLayout() {
  const [showBrandSplash, setShowBrandSplash] = useState(true)
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SpaceGrotesk_700Bold,
  })

  useEffect(() => {
    if (!fontsLoaded) return
    void SplashScreen.hideAsync()
    // Splash de marca visible el tiempo suficiente para que se perciba incluso
    // en aperturas rápidas, después del splash nativo de Android.
    const timer = setTimeout(() => setShowBrandSplash(false), 300)
    return () => clearTimeout(timer)
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.background }}>
        <ActivityIndicator color={Theme.colors.lime} size="large" />
      </View>
    )
  }

  if (showBrandSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#06101F' }}>
        <Image
          source={require('../assets/splash-llevo.png')}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <EnvironmentGate>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </EnvironmentGate>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
