import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { AuthProvider, useAuth } from '../lib/auth'
import { theme } from '../theme'
import { LoadingScreen } from '../components/ui/LoadingScreen'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootNavigator() {
  const { user, isLoading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    const inAuth = segments[0] === 'auth'
    const inOnboard = segments[0] === 'onboarding'
    const atRoot = !segments[0]
    if (!user && !inAuth && !inOnboard) {
      router.replace('/onboarding')
    } else if (user && (inAuth || inOnboard || atRoot)) {
      router.replace('/(tabs)')
    }
  }, [user, isLoading, segments, router])

  if (isLoading) {
    return (
      <LoadingScreen
        title="Cargando tu cuenta"
        subtitle="Estamos validando tu sesión para llevarte directo a la app."
      />
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background.app } }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="trip/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Detalle del viaje',
            headerStyle: { backgroundColor: theme.colors.background.brand },
            headerTintColor: theme.colors.text.inverse,
            headerTitleStyle: { fontFamily: theme.fontFamilies.bold },
          }}
        />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
