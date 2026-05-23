import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { AuthProvider, useAuth } from '../lib/auth'
import { Colors } from '../constants/colors'
import { Theme } from '../constants/theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootNavigator() {
  const { user, isLoading } = useAuth()
  const segments = useSegments()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()

  useEffect(() => {
    if (isLoading) return
    const currentSegments = segments as unknown as string[]
    const inAuth    = currentSegments[0] === 'auth'
    const inOnboard = currentSegments[0] === 'onboarding'
    const atRoot    = currentSegments.length === 0
    if (!user && !inAuth && !inOnboard) {
      router.replace('/onboarding')
    } else if (user && (inAuth || inOnboard || atRoot)) {
      router.replace('/(app)')
    }
  }, [user, isLoading, router, segments])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy }}>
        <ActivityIndicator color={Colors.amber} size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack screenOptions={{ headerShown: false }}>
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
            headerStyle: { backgroundColor: Colors.navy },
            headerTintColor: Colors.white,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: Colors.navy,
          zIndex: 1000,
          elevation: 1000,
        }}
      />
    </View>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SpaceGrotesk_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.background }}>
        <ActivityIndicator color={Theme.colors.lime} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
