import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Icon } from '../../../components/ui/Icon'
import { ListItem } from '../../../components/ui/ListItem'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { theme } from '../../../theme'
import { useAuth } from '../../../lib/auth'
import { MOCK_REVIEWS } from '../../../lib/mockData'

export default function PerfilScreen() {
  const { user, logout } = useAuth()
  const initials = user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? 'RA'

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que querés salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.glowA} />
            <View style={styles.glowB} />
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.headerCopy}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{user?.name}</Text>
                  {user?.isVerified ? <Badge status="ACCEPTED" label="Verificado" /> : null}
                </View>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.phone}>{user?.phone}</Text>
              </View>
            </View>

            <View style={styles.reputationCard}>
              <View style={styles.reputationTop}>
                <View>
                  <Text style={styles.reputationLabel}>Reputación actual</Text>
                  <Text style={styles.reputationValue}>{user?.rating?.toFixed(1)}</Text>
                </View>
                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Icon
                      key={index}
                      name="star"
                      size={14}
                      color={index < Math.round(user?.rating ?? 0) ? theme.colors.icon.accent : 'rgba(255,255,255,0.22)'}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.reputationHelp}>
                Basado en {user?.ratingCount} reseñas, cumplimiento de rutas y respuestas confirmadas.
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Card style={styles.statCard} padded={false}>
              <Text style={styles.statValue}>{user?.ratingCount}</Text>
              <Text style={styles.statLabel}>reseñas</Text>
            </Card>
            <Card style={styles.statCard} padded={false}>
              <Text style={styles.statValue}>$86.400</Text>
              <Text style={styles.statLabel}>ingresos generados</Text>
            </Card>
            <Card style={styles.statCard} padded={false}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>operaciones cerradas</Text>
            </Card>
          </View>

          <Card style={styles.verificationCard} elevated="md">
            <View style={styles.verificationTop}>
              <View style={styles.verificationIconWrap}>
                <Icon name="shield" size={18} color={theme.colors.icon.success} />
              </View>
              <View style={styles.verificationCopy}>
                <Text style={styles.verificationTitle}>Cuenta lista para operar</Text>
                <Text style={styles.verificationDescription}>
                  Tu perfil ya muestra reputación, contacto verificado y estado de custodia para futuras transacciones.
                </Text>
              </View>
            </View>
            <Button label="Completar perfil profesional" onPress={() => {}} variant="outline" rightIcon="arrow-right" />
          </Card>

          <View style={styles.section}>
            <SectionHeader title="Últimas reseñas" />
            <View style={styles.reviewList}>
              {MOCK_REVIEWS.map((review) => (
                <Card key={review.id}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{review.fromName}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Icon key={`${review.id}-${index}`} name="star" size={12} color={theme.colors.icon.accent} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Cuenta y preferencias" />
            <Card style={styles.menuCard} elevated="md">
              <ListItem icon="map" label="Mis rutas habituales" description="Guardá recorridos frecuentes para publicar más rápido." onPress={() => {}} />
              <ListItem icon="credit-card" label="Métodos de pago" description="Administrá cobros, custodia y liberación de fondos." onPress={() => {}} />
              <ListItem icon="dollar-sign" label="Mis ganancias" description="Revisá ingresos por asiento y por encomienda." onPress={() => {}} />
              <ListItem icon="bell" label="Notificaciones" description="Configurá recordatorios y avisos de nuevas solicitudes." onPress={() => {}} />
              <ListItem icon="lock" label="Privacidad y seguridad" description="Controlá visibilidad, validación y acceso a tu cuenta." onPress={() => {}} />
              <ListItem icon="help-circle" label="Ayuda y soporte" description="Accedé a asistencia, reclamos y preguntas frecuentes." onPress={() => {}} />
              <ListItem icon="log-out" label="Cerrar sesión" description="Salir de esta cuenta en el dispositivo actual." onPress={handleLogout} danger />
            </Card>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>LLEVO · v1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 124,
  },
  hero: {
    overflow: 'hidden',
    backgroundColor: theme.colors.background.brand,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  glowA: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.14)',
  },
  glowB: {
    position: 'absolute',
    bottom: -80,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(78, 122, 167, 0.18)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.action.accent,
  },
  avatarText: {
    ...theme.textStyles.h2,
    color: theme.colors.text.brand,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  name: {
    ...theme.textStyles.h2,
    color: theme.colors.text.inverse,
  },
  email: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.74)',
  },
  phone: {
    ...theme.textStyles.caption,
    color: 'rgba(255,255,255,0.62)',
  },
  reputationCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  reputationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  reputationLabel: {
    ...theme.textStyles.caption,
    color: 'rgba(255,255,255,0.66)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  reputationValue: {
    ...theme.textStyles.display,
    color: theme.colors.text.inverse,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  reputationHelp: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.74)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginTop: -24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  statValue: {
    ...theme.textStyles.title,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  statLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  verificationCard: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  verificationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  verificationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.successSoft,
  },
  verificationCopy: {
    flex: 1,
    gap: 2,
  },
  verificationTitle: {
    ...theme.textStyles.titleSmall,
    color: theme.colors.text.primary,
  },
  verificationDescription: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  reviewList: {
    gap: theme.spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  reviewName: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
  },
  menuCard: {
    gap: 0,
  },
  footer: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
  },
  footerText: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
})
