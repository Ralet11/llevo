import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Theme } from '../../../constants/theme'

export default function DriverPanelLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.colors.lime,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: Theme.colors.surface,
          borderTopColor: Theme.colors.border,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: Theme.fonts.semiBold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rutas"
        options={{
          title: 'Mis rutas',
          tabBarIcon: ({ color, size }) => <Ionicons name="git-branch" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ganancias"
        options={{
          title: 'Ganancias',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
