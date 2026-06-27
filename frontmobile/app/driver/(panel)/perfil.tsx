import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../../components/app/ScreenSafeArea'
import { Theme } from '../../../constants/theme'
import { useAuth } from '../../../lib/auth'
import { styles } from '../_panel'

export default function DriverPerfilScreen() {
  const { user, driverProfile, logout } = useAuth()
  const ratingLabel = user && user.ratingCount > 0 ? user.rating.toFixed(1) : 'Nuevo'

  async function handleLogout() {
    await logout()
    router.replace('/onboarding')
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

        {/* Acciones */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.rejectBtn}
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
