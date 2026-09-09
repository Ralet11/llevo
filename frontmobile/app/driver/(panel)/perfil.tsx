import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { DriverOnlineBar } from '../../../components/app/DriverOnlineBar'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { styles } from '../_panel'

const SHOW_TEST_CONTROLS = __DEV__ || process.env.EXPO_PUBLIC_SKIP_DRIVER_VERIFICATION === 'true'

export default function DriverPerfilScreen() {
  const { user, driverProfile, clearDriverProfile, logout } = useAuth()
  const ratingLabel = user && user.ratingCount > 0 ? user.rating.toFixed(1) : 'Nuevo'

  async function handleLogout() {
    await logout()
    router.replace('/onboarding')
  }

  function confirmWizardReset() {
    Alert.alert(
      'Reiniciar wizard',
      'Vas a volver al primer paso del onboarding de conductor. Tus rutas y viajes de prueba no se borrarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await clearDriverProfile()
                router.replace('/driver')
              } catch (error) {
                Alert.alert(
                  'No se pudo reiniciar',
                  error instanceof Error ? error.message : 'Intentá nuevamente.',
                )
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Modo conductor</Text>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DriverOnlineBar />

        {/* Identidad */}
        <View style={styles.offerCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.nudgeIcon}>
              <Ionicons name="person" size={22} color={Theme.colors.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{user?.name ?? 'Conductor'}</Text>
              <Text style={styles.heroSub}>
                ⭐ {ratingLabel} · {user?.ratingCount ?? 0} entregas
              </Text>
            </View>
          </View>
        </View>

        {/* Datos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu cuenta</Text>
          <View style={styles.offerCard}>
            <ProfileRow icon="call-outline" label="Teléfono" value={user?.phone ?? '—'} />
            <ProfileRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
            <ProfileRow
              icon="shield-checkmark-outline"
              label="Verificación"
              value={user?.driverVerificationStatus === 'APPROVED' ? 'Aprobada' : 'Pendiente'}
            />
            {driverProfile?.vehicle ? (
              <ProfileRow icon="car-outline" label="Vehículo" value={driverProfile.vehicle} />
            ) : null}
          </View>
        </View>

        {/* Tu operación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu operación</Text>
          <TouchableOpacity
            style={styles.offerCard}
            activeOpacity={0.85}
            onPress={() => router.push('/driver/vehicles')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.nudgeIcon}>
                <Ionicons name="car-sport" size={20} color={Theme.colors.black} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailValue}>Mis vehículos</Text>
                <Text style={styles.heroSub}>Cargá tus vehículos y asientos para llevar pasajeros.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.offerCard, { marginTop: 10 }]}
            activeOpacity={0.85}
            onPress={() => router.push('/driver/ride-requests')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.nudgeIcon}>
                <Ionicons name="people" size={20} color={Theme.colors.black} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailValue}>Solicitudes de viaje</Text>
                <Text style={styles.heroSub}>Aprobá o rechazá a los pasajeros que quieren sumarse.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          {SHOW_TEST_CONTROLS ? (
            <TouchableOpacity
              style={[styles.rejectBtn, { borderColor: Theme.colors.warning }]}
              activeOpacity={0.85}
              onPress={confirmWizardReset}
            >
              <Ionicons name="refresh-circle-outline" size={19} color={Theme.colors.warning} />
              <Text style={[styles.rejectBtnText, { color: Theme.colors.warning }]}>Reiniciar wizard de conductor</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.rejectBtn, SHOW_TEST_CONTROLS && { marginTop: 10 }]}
            activeOpacity={0.85}
            onPress={() => router.replace('/(app)')}
          >
            <Ionicons name="swap-horizontal" size={18} color={Theme.colors.text} />
            <Text style={styles.rejectBtnText}>Volver a modo usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, { marginTop: 10 }]}
            activeOpacity={0.85}
            onPress={() => void handleLogout()}
          >
            <Ionicons name="log-out-outline" size={18} color={Theme.colors.danger} />
            <Text style={[styles.rejectBtnText, { color: Theme.colors.danger }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenSafeArea>
  )
}

function ProfileRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={Theme.colors.lime} style={styles.detailIcon} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}
