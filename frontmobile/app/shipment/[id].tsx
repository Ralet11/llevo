import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { IconButton } from '../../components/ui/IconButton'
import { Badge } from '../../components/ui/Badge'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { fetchShipment, type MyShipment } from '../../lib/shipments'
import { useTheme } from '../../lib/theme'

const PACKAGE_SIZE_LABELS: Record<MyShipment['packageSize'], string> = {
  SMALL: 'Pequeno',
  MEDIUM: 'Mediano',
  LARGE: 'Grande',
  BULKY: 'Voluminoso',
}

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const [shipment, setShipment] = useState<MyShipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    try {
      setShipment(await fetchShipment(token, id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar la solicitud.')
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Detalle del envio</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.lime} /></View>
      ) : error || !shipment ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={38} color={colors.textMuted} />
          <Text style={styles.errorText}>{error ?? 'Solicitud no encontrada.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void load()}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusCard}>
            <View style={styles.statusTop}>
              <Text style={styles.eyebrow}>Estado del envio</Text>
              <Badge status={shipment.status} />
            </View>
            <Text style={styles.route}>{shipment.originCity} - {shipment.destinationCity}</Text>
            <Text style={styles.createdAt}>Solicitado el {new Date(shipment.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</Text>
          </View>

          <DetailCard title="Recorrido" icon="navigate-outline" styles={styles}>
            <DetailRow label="Retiro" value={shipment.originAddress} styles={styles} />
            <DetailRow label="Entrega" value={shipment.deliveryAddress} styles={styles} />
          </DetailCard>

          <DetailCard title="Paquete" icon="cube-outline" styles={styles}>
            <DetailRow label="Tamano" value={PACKAGE_SIZE_LABELS[shipment.packageSize]} styles={styles} />
            <DetailRow label="Peso estimado" value={`${shipment.weightKg} kg`} styles={styles} />
            <DetailRow label="Destinatario" value={shipment.recipientDetails} styles={styles} />
          </DetailCard>

          {shipment.job?.driver ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.driverCard}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: shipment.job!.driver.id } })}
            >
              <View style={styles.driverIcon}><Ionicons name="car-sport" size={20} color={colors.black} /></View>
              <View style={styles.driverCopy}>
                <Text style={styles.driverLabel}>Conductor asignado</Text>
                <Text style={styles.driverName}>{shipment.job.driver.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </ScreenSafeArea>
  )
}

function DetailCard({ title, icon, children, styles }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; children: React.ReactNode; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.card}><View style={styles.cardTitle}><Ionicons name={icon} size={17} color={styles.iconColor.color} /><Text style={styles.cardTitleText}>{title}</Text></View>{children}</View>
}

function DetailRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  headerSpacer: { width: 46 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28 },
  errorText: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, textAlign: 'center' },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Theme.radius.md, backgroundColor: colors.surfaceElevated },
  retryText: { color: colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 13 },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  statusCard: { padding: 18, borderRadius: Theme.radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  route: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 22, marginTop: 14 },
  createdAt: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, marginTop: 5 },
  card: { padding: 16, borderRadius: Theme.radius.lg, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconColor: { color: colors.lime },
  cardTitleText: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  row: { gap: 3 },
  rowLabel: { color: colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { color: colors.text, fontFamily: Theme.fonts.medium, fontSize: 14, lineHeight: 20 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Theme.radius.lg, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.lime },
  driverIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime },
  driverCopy: { flex: 1 },
  driverLabel: { color: colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  driverName: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14, marginTop: 3 },
})
