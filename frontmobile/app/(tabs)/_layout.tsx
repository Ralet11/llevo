import { Tabs } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Icon } from '../../components/ui/Icon'
import { theme } from '../../theme'

type TabIconProps = {
  icon: React.ComponentProps<typeof Icon>['name']
  label: string
  focused: boolean
}

function TabIcon({ icon, label, focused }: TabIconProps) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Icon
        name={icon}
        size={18}
        color={focused ? theme.colors.icon.brand : theme.colors.icon.muted}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  )
}

function PublishIcon() {
  return (
    <View style={styles.publishButton}>
      <Icon name="plus" size={20} color={theme.colors.icon.brand} />
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: styles.scene,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="home" label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="search" label="Buscar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="publicar"
        options={{
          tabBarIcon: () => <PublishIcon />,
        }}
      />
      <Tabs.Screen
        name="misviajes"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="briefcase" label="Viajes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="user" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: theme.colors.background.app,
  },
  tabBar: {
    height: 84,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background.elevated,
    borderTopWidth: 0,
    ...theme.shadows.lg,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabItem: {
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  tabItemActive: {
    backgroundColor: theme.colors.background.brandSoft,
  },
  tabLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.subtle,
  },
  tabLabelActive: {
    color: theme.colors.text.brand,
  },
  publishButton: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.action.accent,
    borderWidth: 1,
    borderColor: theme.colors.action.accent,
    marginTop: -10,
    ...theme.shadows.md,
  },
})
