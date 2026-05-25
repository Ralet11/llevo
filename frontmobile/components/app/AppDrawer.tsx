import { Ionicons } from '@expo/vector-icons'
import { Href } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from '../../constants/theme'
import type { User } from '../../lib/auth'
import { Avatar } from '../ui/Avatar'

type IconName = React.ComponentProps<typeof Ionicons>['name']

type DrawerItem = {
  icon: IconName
  label: string
  href: Href
}

type Props = {
  activePath: string
  user: User | null
  visible: boolean
  onClose: () => void
  onNavigate: (href: Href) => void
  onDriverMode: () => void
  onLogout: () => void
}

const { width } = Dimensions.get('window')
const DRAWER_WIDTH = Math.min(width * 0.82, 328)

const ITEMS: DrawerItem[] = [
  { icon: 'business-outline', label: 'Ciudad', href: '/(app)/city' },
  { icon: 'time-outline', label: 'Historial de solicitudes', href: '/(app)/history' },
  { icon: 'cube-outline', label: 'Entregas', href: '/(app)/deliveries' },
  { icon: 'car-sport-outline', label: 'Flete', href: '/(app)/freight' },
  { icon: 'notifications-outline', label: 'Notificaciones', href: '/(app)/notifications' },
  { icon: 'shield-checkmark-outline', label: 'Seguridad', href: '/(app)/safety' },
  { icon: 'settings-outline', label: 'Configuracion', href: '/(app)/profile' },
  { icon: 'help-circle-outline', label: 'Ayuda', href: '/(app)/help' },
  { icon: 'chatbubble-ellipses-outline', label: 'Soporte', href: '/(app)/support' },
]

function getInitials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map(part => part[0]).join('').slice(0, 2)
}

function MenuRow({ item, active, onPress }: { item: DrawerItem; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.menuRow, active && styles.menuRowActive]}
    >
      <Ionicons name={item.icon} size={18} color={active ? Theme.colors.text : Theme.colors.textMuted} />
      <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
    </TouchableOpacity>
  )
}

export function AppDrawer({ activePath, user, visible, onClose, onNavigate, onDriverMode, onLogout }: Props) {
  const [shouldRender, setShouldRender] = useState(visible)
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      setShouldRender(true)
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start()
      return
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShouldRender(false)
    })
  }, [opacity, translateX, visible])

  useEffect(() => {
    if (!visible) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => subscription.remove()
  }, [onClose, visible])

  if (!shouldRender) return null

  const initials = getInitials(user?.name)

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={styles.root}>
      <Animated.View style={[styles.scrim, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View renderToHardwareTextureAndroid style={[styles.drawer, { transform: [{ translateX }] }]}>
        <SafeAreaView style={styles.drawerSafe} edges={['top', 'bottom']}>
          <View style={styles.profileRow}>
            <View style={styles.notificationDot}>
              <Text style={styles.notificationText}>0</Text>
            </View>
            <Avatar initials={initials} size={46} />
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{user?.name ?? 'Usuario LLEVO'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={Theme.colors.warning} />
                <Text style={styles.ratingText}>{user?.rating?.toFixed(1) ?? '0.0'} ({user?.ratingCount ?? 0})</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.text} />
          </View>

          <View style={styles.menu}>
            {ITEMS.map(item => (
              <MenuRow
                key={item.label}
                item={item}
                active={activePath === item.href}
                onPress={() => onNavigate(item.href)}
              />
            ))}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity activeOpacity={0.86} style={styles.driverMode} onPress={onDriverMode}>
              <Text style={styles.driverModeText}>Modo conductor</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.78} style={styles.logout} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color={Theme.colors.danger} />
              <Text style={styles.logoutText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Theme.colors.scrim,
    zIndex: 100,
    elevation: 100,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Theme.colors.background,
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
    zIndex: 101,
    elevation: 101,
  },
  drawerSafe: {
    flex: 1,
  },
  profileRow: {
    minHeight: 76,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationDot: {
    position: 'absolute',
    left: 22,
    top: 10,
    zIndex: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.danger,
    borderWidth: 2,
    borderColor: Theme.colors.background,
  },
  notificationText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 9,
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 11,
  },
  menu: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: 6,
  },
  menuRow: {
    minHeight: 42,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuRowActive: {
    backgroundColor: Theme.colors.surfaceElevated,
  },
  menuLabel: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
  },
  menuLabelActive: {
    fontFamily: Theme.fonts.bold,
  },
  footer: {
    marginTop: 'auto',
    padding: 20,
    gap: 12,
  },
  driverMode: {
    height: 48,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  driverModeText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  logout: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: Theme.colors.danger,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
})
