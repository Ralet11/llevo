import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Colors } from '../../../constants/colors'
import { Badge } from '../../../components/ui/Badge'
import { useAuth } from '../../../lib/auth'
import { MOCK_REVIEWS } from '../../../lib/mockData'

function MenuRow({ icon, label, onPress, danger }: {
  icon: string; label: string; onPress: () => void; danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && { color: Colors.red }]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  )
}

export default function PerfilScreen() {
  const { user, logout } = useAuth()

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?'

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.name}</Text>
            {user?.isVerified && <Badge status="ACCEPTED" label="Verificado" />}
          </View>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {'★'.repeat(Math.floor(user?.rating ?? 0))} {user?.rating?.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Calificación</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.ratingCount}</Text>
          <Text style={styles.statLabel}>Viajes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>$86.400</Text>
          <Text style={styles.statLabel}>Generado</Text>
        </View>
      </View>

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimas reseñas</Text>
        {MOCK_REVIEWS.map(rev => (
          <View key={rev.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewName}>{rev.fromName}</Text>
              <Text style={styles.reviewStars}>{'★'.repeat(rev.rating)}</Text>
            </View>
            <Text style={styles.reviewComment}>{rev.comment}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuRow icon="🗺️" label="Mis rutas habituales" onPress={() => {}} />
        <MenuRow icon="💳" label="Métodos de pago" onPress={() => {}} />
        <MenuRow icon="💰" label="Mis ganancias" onPress={() => {}} />
        <MenuRow icon="🔔" label="Notificaciones" onPress={() => {}} />
        <MenuRow icon="🔒" label="Privacidad y seguridad" onPress={() => {}} />
        <MenuRow icon="❓" label="Ayuda y soporte" onPress={() => {}} />
        <MenuRow icon="🚪" label="Cerrar sesión" onPress={handleLogout} danger />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>LLEVO · v1.0.0</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayLight },

  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { color: Colors.navy, fontWeight: '800', fontSize: 26 },
  userInfo:    { flex: 1 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  name:        { color: Colors.white, fontSize: 20, fontWeight: '800' },
  email:       { color: Colors.blueM, fontSize: 13 },

  stats: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 16, marginTop: -16,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 16, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  statLabel:   { fontSize: 11, color: Colors.gray },
  statDivider: { width: 1, backgroundColor: Colors.grayMid, marginHorizontal: 8 },

  section:      { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark, marginBottom: 12 },

  reviewCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  reviewHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewName:    { fontSize: 13, fontWeight: '700', color: Colors.dark },
  reviewStars:   { color: Colors.amber, fontSize: 12 },
  reviewComment: { fontSize: 13, color: Colors.gray, lineHeight: 18 },

  menu: {
    backgroundColor: Colors.white,
    marginHorizontal: 16, marginTop: 24,
    borderRadius: 16, overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  menuIcon:  { fontSize: 18, width: 32 },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.dark },
  menuArrow: { fontSize: 20, color: Colors.gray },

  footer:     { alignItems: 'center', marginTop: 24 },
  footerText: { color: Colors.gray, fontSize: 12 },
})
