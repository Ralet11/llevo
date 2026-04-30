import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { Reveal } from '../../components/ui/Reveal'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { theme } from '../../theme'
import { MOCK_REVIEWS, MOCK_TRIPS } from '../../lib/mockData'

type RequestMode = 'passenger' | 'package' | null

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const trip = MOCK_TRIPS.find((item) => item.id === id) ?? MOCK_TRIPS[0]
  const [mode, setMode] = useState<RequestMode>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [weightKg, setWeightKg] = useState('')

  const departureDate = new Date(trip.departureDate)
  const departureDay = departureDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const departureTime = departureDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const estimatedTotal =
    mode === 'passenger'
      ? trip.pricePerSeat
      : Number(weightKg) > 0
        ? Number(weightKg) * trip.pricePerKg
        : null

  async function handleRequest() {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
    setMode(null)
    setMessage('')
    setWeightKg('')
    Alert.alert('Solicitud enviada', 'El viajero revisará tu pedido y te responderá a la brevedad.')
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Reveal delay={30}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.driverWrap}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>{trip.driver.initials}</Text>
                  </View>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverNameRow}>
                      <Text style={styles.driverName}>{trip.driver.name}</Text>
                      {trip.driver.isVerified ? <Badge status="ACCEPTED" label="Verificado" /> : null}
                    </View>
                    <View style={styles.driverRatingRow}>
                      <Icon name="star" size={14} color={theme.colors.icon.accent} />
                      <Text style={styles.driverRatingText}>
                        {trip.driver.rating} · {trip.driver.ratingCount} reseñas
                      </Text>
                    </View>
                  </View>
                </View>
                <Badge status={trip.status} />
              </View>

              <View style={styles.routeCard}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.originDot]} />
                  <View>
                    <Text style={styles.routeLabel}>Origen</Text>
                    <Text style={styles.routeCity}>{trip.originCity}</Text>
                  </View>
                </View>
                <View style={styles.routeMiddle}>
                  <View style={styles.routeLine} />
                  <Icon name="arrow-right" size={16} color={theme.colors.icon.muted} />
                  <View style={styles.routeLine} />
                </View>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.destinationDot]} />
                  <View>
                    <Text style={styles.routeLabel}>Destino</Text>
                    <Text style={styles.routeCity}>{trip.destinationCity}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripMeta}>
                <View style={styles.tripMetaItem}>
                  <Icon name="calendar" size={15} color={theme.colors.icon.inverse} />
                  <Text style={styles.tripMetaText}>{departureDay}</Text>
                </View>
                <View style={styles.tripMetaItem}>
                  <Icon name="clock" size={15} color={theme.colors.icon.inverse} />
                  <Text style={styles.tripMetaText}>Sale a las {departureTime}</Text>
                </View>
              </View>
            </View>
          </Reveal>

          <Reveal delay={90}>
            <View style={styles.section}>
              <SectionHeader title="Disponibilidad" />
              <View style={styles.availabilityRow}>
                {trip.availableSeats > 0 ? (
                  <Card style={styles.availabilityCard}>
                    <View style={styles.availabilityIconWrap}>
                      <Icon name="users" size={18} color={theme.colors.icon.brand} />
                    </View>
                    <Text style={styles.availabilityLabel}>Asientos</Text>
                    <Text style={styles.availabilityValue}>{trip.availableSeats} disponibles</Text>
                    <Text style={styles.availabilityPrice}>${trip.pricePerSeat.toLocaleString()} por asiento</Text>
                  </Card>
                ) : null}
                {trip.availableKg > 0 ? (
                  <Card style={styles.availabilityCard}>
                    <View style={styles.availabilityIconWrap}>
                      <Icon name="package" size={18} color={theme.colors.icon.brand} />
                    </View>
                    <Text style={styles.availabilityLabel}>Carga</Text>
                    <Text style={styles.availabilityValue}>{trip.availableKg} kg disponibles</Text>
                    <Text style={styles.availabilityPrice}>${trip.pricePerKg} por kilo</Text>
                  </Card>
                ) : null}
              </View>
            </View>
          </Reveal>

          {trip.notes ? (
            <Reveal delay={130}>
              <View style={styles.section}>
                <SectionHeader title="Notas del viajero" />
                <Card>
                  <View style={styles.noteRow}>
                    <Icon name="message-circle" size={16} color={theme.colors.icon.secondary} />
                    <Text style={styles.noteText}>{trip.notes}</Text>
                  </View>
                </Card>
              </View>
            </Reveal>
          ) : null}

          <Reveal delay={170}>
            <View style={styles.section}>
              <SectionHeader title="Confianza y cobertura" />
              <Card style={styles.coverageCard}>
                <View style={styles.coverageRow}>
                  <View style={styles.coverageIconWrap}>
                    <Icon name="shield" size={18} color={theme.colors.icon.success} />
                  </View>
                  <View style={styles.coverageCopy}>
                    <Text style={styles.coverageTitle}>Pago en custodia</Text>
                    <Text style={styles.coverageDescription}>
                      El dinero se libera sólo cuando el viaje o la entrega se confirma correctamente.
                    </Text>
                  </View>
                </View>
                <View style={styles.coverageRow}>
                  <View style={styles.coverageIconWrap}>
                    <Icon name="check-circle" size={18} color={theme.colors.icon.brand} />
                  </View>
                  <View style={styles.coverageCopy}>
                    <Text style={styles.coverageTitle}>Perfil con reputación visible</Text>
                    <Text style={styles.coverageDescription}>
                      Podés revisar calificaciones, conductor verificado y comentarios antes de solicitar.
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          </Reveal>

          <Reveal delay={210}>
            <View style={styles.section}>
              <SectionHeader title="Reseñas recientes" />
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
          </Reveal>
        </ScrollView>

        <Reveal delay={260} style={styles.stickyCta}>
          <>
            {trip.availableSeats > 0 ? (
              <Button
                label="Solicitar asiento"
                onPress={() => setMode('passenger')}
                variant="secondary"
                leftIcon="users"
                style={styles.stickyButton}
              />
            ) : null}
            {trip.availableKg > 0 ? (
              <Button
                label="Enviar paquete"
                onPress={() => setMode('package')}
                variant="outline"
                leftIcon="package"
                style={styles.stickyButton}
              />
            ) : null}
          </>
        </Reveal>

        <Modal
          visible={mode !== null}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setMode(null)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboard}
            >
              <View style={styles.modalSheet}>
                <ScrollView
                  contentContainerStyle={styles.modalContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {mode === 'passenger' ? 'Solicitar asiento' : 'Enviar paquete'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {trip.originCity} → {trip.destinationCity} · {departureDay}
              </Text>

              {mode === 'package' ? (
                <Input
                  label="Peso aproximado"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  placeholder="Ej: 3"
                  leadingIcon="package"
                  hint="Indicá el peso estimado para calcular el costo total."
                />
              ) : null}

              <Input
                label="Mensaje para el viajero"
                value={message}
                onChangeText={setMessage}
                placeholder="Ej: puedo retirar por el centro o coordinar un punto intermedio."
                leadingIcon="message-circle"
                multiline
                numberOfLines={3}
              />

              <Card style={styles.summaryCard} elevated="none">
                <Text style={styles.summaryLabel}>Total estimado</Text>
                <Text style={styles.summaryValue}>
                  {estimatedTotal != null ? `$${estimatedTotal.toLocaleString()}` : 'Completá los datos'}
                </Text>
              </Card>

              <Button
                label="Confirmar solicitud"
                onPress={handleRequest}
                loading={loading}
                variant="secondary"
                rightIcon="arrow-right"
              />
              <Button
                label="Cancelar"
                onPress={() => setMode(null)}
                variant="ghost"
                style={styles.cancelButton}
              />
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
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
    paddingBottom: 170,
    gap: theme.spacing.xl,
  },
  hero: {
    backgroundColor: theme.colors.background.brand,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  driverWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  driverAvatar: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.action.accent,
  },
  driverInitials: {
    ...theme.textStyles.title,
    color: theme.colors.text.brand,
  },
  driverInfo: {
    flex: 1,
    gap: 4,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  driverName: {
    ...theme.textStyles.h3,
    color: theme.colors.text.inverse,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverRatingText: {
    ...theme.textStyles.caption,
    color: 'rgba(255,255,255,0.74)',
  },
  routeCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  originDot: {
    backgroundColor: theme.colors.action.accent,
  },
  destinationDot: {
    backgroundColor: theme.colors.background.brandSoft,
  },
  routeMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: 6,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.inverse,
  },
  routeLabel: {
    ...theme.textStyles.caption,
    color: 'rgba(255,255,255,0.66)',
  },
  routeCity: {
    ...theme.textStyles.h3,
    color: theme.colors.text.inverse,
  },
  tripMeta: {
    gap: theme.spacing.sm,
  },
  tripMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tripMetaText: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.78)',
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  availabilityCard: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  availabilityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
  },
  availabilityLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  availabilityValue: {
    ...theme.textStyles.titleSmall,
    color: theme.colors.text.primary,
  },
  availabilityPrice: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  noteText: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  coverageCard: {
    gap: theme.spacing.lg,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  coverageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.successSoft,
  },
  coverageCopy: {
    flex: 1,
    gap: 2,
  },
  coverageTitle: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
  },
  coverageDescription: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
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
  stickyCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background.elevated,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    gap: theme.spacing.sm,
    ...theme.shadows.lg,
  },
  stickyButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  modalContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border.default,
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.textStyles.h3,
    color: theme.colors.text.primary,
  },
  modalSubtitle: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  summaryCard: {
    backgroundColor: theme.colors.background.app,
    marginBottom: theme.spacing.lg,
  },
  summaryLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    ...theme.textStyles.h3,
    color: theme.colors.text.brand,
  },
  cancelButton: {
    marginTop: theme.spacing.sm,
  },
})
