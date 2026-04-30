import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from '../lib/auth'
import { Colors } from '../constants/colors'

function RootNavigator() {
  const { user, isLoading } = useAuth()
  const segments = useSegments()
  const router   = useRouter()

  useEffect(() => {
    if (isLoading) return
    const inAuth    = segments[0] === 'auth'
    const inOnboard = segments[0] === 'onboarding'
    if (!user && !inAuth && !inOnboard) {
      router.replace('/onboarding')
    } else if (user && (inAuth || inOnboard || segments.length === 0)) {
      router.replace('/(tabs)')
    }
  }, [user, isLoading, segments])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy }}>
        <ActivityIndicator color={Colors.amber} size="large" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
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
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
