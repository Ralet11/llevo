import { Tabs } from 'expo-router'
import { Colors } from '../../constants/colors'
import { View, Text, StyleSheet } from 'react-native'

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" label="Buscar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="publicar"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.publishBtn}>
              <Text style={styles.publishIcon}>+</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="misviajes"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Mis viajes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.grayMid,
    height: 72,
    paddingBottom: 8,
  },
  tabItem:      { alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon:      { fontSize: 22, opacity: 0.4 },
  tabIconActive:{ opacity: 1 },
  tabLabel:     { fontSize: 10, color: Colors.gray },
  tabLabelActive:{ color: Colors.navy, fontWeight: '600' },
  publishBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.amber,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  publishIcon: { fontSize: 26, fontWeight: '300', color: Colors.navy },
})
