import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { api } from '../../../lib/api'
import { RouteCard, styles, type DriverRoute } from '../_panel'

export default function DriverRutasScreen() {
  const { token } = useAuth()
  const [routes, setRoutes] = useState<DriverRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      void fetchRoutes()
    }, [token])
  )

  async function fetchRoutes() {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.get<{ routes: DriverRoute[] }>('/drivers/routes/mine', token)
      setRoutes(data.routes)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleToggleRoute(route: DriverRoute) {
    if (!token) return
    setTogglingId(route.id)
    try {
      await api.patch(`/drivers/routes/${route.id}`, { isActive: !route.isActive }, token)
      setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, isActive: !r.isActive } : r))
    } catch {} finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteRoute(routeId: string) {
    if (!token) return
    setDeletingId(routeId)
    try {
      await api.delete(`/drivers/routes/${routeId}`, token)
      setRoutes(prev => prev.filter(r => r.id !== routeId))
    } catch {} finally {
      setDeletingId(null)
    }
  }

  const hasLocal = routes.some(r => r.kind === 'LOCAL')
  const hasIntercity = routes.some(r => r.kind === 'INTERCITY')
  const missingKind: 'LOCAL' | 'INTERCITY' | null =
    routes.length === 0 ? null : !hasLocal ? 'LOCAL' : !hasIntercity ? 'INTERCITY' : null

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Mis rutas</Text>
        </View>
        <TouchableOpacity
          style={styles.addRouteBtn}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/driver/setup', params: { mode: 'entrega', addingRoute: '1' } })}
        >
          <Ionicons name="add" size={16} color={Theme.colors.black} />
          <Text style={styles.addRouteBtnText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {loading && routes.length === 0 ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Theme.colors.lime} />
            </View>
          ) : routes.length === 0 ? (
            <View style={styles.emptyRoutes}>
              <Text style={styles.emptyRoutesText}>No tenés rutas registradas aún.</Text>
            </View>
          ) : (
            routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                toggling={togglingId === route.id}
                deleting={deletingId === route.id}
                onToggle={() => void handleToggleRoute(route)}
                onDelete={() => void handleDeleteRoute(route.id)}
              />
            ))
          )}

          {missingKind ? (
            <TouchableOpacity
              style={styles.nudgeCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/driver/setup', params: { mode: 'entrega', addingRoute: '1', kind: missingKind } })}
            >
              <View style={styles.nudgeIcon}>
                <Ionicons name={missingKind === 'LOCAL' ? 'business' : 'navigate'} size={20} color={Theme.colors.black} />
              </View>
              <View style={styles.nudgeBody}>
                <Text style={styles.nudgeTitle}>
                  {missingKind === 'LOCAL' ? 'Sumá envíos locales' : 'Sumá rutas entre ciudades'}
                </Text>
                <Text style={styles.nudgeDesc}>
                  {missingKind === 'LOCAL'
                    ? 'Recibí pedidos dentro de tu ciudad cuando estés online.'
                    : 'Publicá viajes programados A → B y llevá paquetes en el camino.'}
                </Text>
              </View>
              <Ionicons name="add-circle" size={24} color={Theme.colors.lime} />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </ScreenSafeArea>
  )
}
