import { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Icon } from '../../../components/ui/Icon'
import { Input } from '../../../components/ui/Input'
import { Reveal } from '../../../components/ui/Reveal'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { theme } from '../../../theme'

type TripType = 'single' | 'recurring'
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function PublicarScreen() {
  const [tripType, setTripType] = useState<TripType>('single')
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState('0')
  const [priceS, setPriceS] = useState('')
  const [kg, setKg] = useState('0')
  const [priceKg, setPriceKg] = useState('')
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  function toggleDay(index: number) {
    setDays((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]))
  }

  const grossSeatRevenue = (Number(seats) || 0) * (Number(priceS) || 0)
  const grossCargoRevenue = (Number(kg) || 0) * (Number(priceKg) || 0)
  const grossRevenue = grossSeatRevenue + grossCargoRevenue
  const commission = Math.round(grossRevenue * 0.12)
  const netRevenue = grossRevenue - commission

  const selectedDaysLabel = useMemo(() => {
    if (tripType !== 'recurring' || days.length === 0) return 'Elegí uno o más días'
    return days
      .slice()
      .sort((a, b) => a - b)
      .map((day) => DAYS[day])
      .join(' · ')
  }, [days, tripType])

  async function handlePublish() {
    if (!origin || !dest) {
      Alert.alert('Completá la ruta', 'Necesitamos al menos origen y destino para publicar tu salida.')
      return
    }

    if (tripType === 'single' && (!date || !time)) {
      Alert.alert('Falta programación', 'Indicá fecha y horario de salida para este viaje.')
      return
    }

    if (tripType === 'recurring' && (!time || days.length === 0)) {
      Alert.alert('Falta recurrencia', 'Definí los días y el horario habitual para publicar esta ruta.')
      return
    }

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)

    Alert.alert(
      'Viaje publicado',
      'Tu disponibilidad ya quedó visible para pasajeros y envíos dentro de la red.',
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.glowA} />
            <View style={styles.glowB} />
            <Reveal delay={30}>
              <>
                <Text style={styles.eyebrow}>Publicá una salida</Text>
                <Text style={styles.title}>Convertí una ruta habitual en una oferta lista para vender.</Text>
                <Text style={styles.subtitle}>
                  Definí capacidad para pasajeros y encomiendas, sumá contexto útil y dejá todo listo para recibir solicitudes.
                </Text>

                <View style={styles.heroPills}>
                  <View style={styles.heroPill}>
                    <Icon name="shield" size={14} color={theme.colors.icon.inverse} />
                    <Text style={styles.heroPillText}>Pago con custodia</Text>
                  </View>
                  <View style={styles.heroPill}>
                    <Icon name="percent" size={14} color={theme.colors.icon.inverse} />
                    <Text style={styles.heroPillText}>12% comisión por operación</Text>
                  </View>
                </View>
              </>
            </Reveal>
          </View>

          <View style={styles.body}>
            <Reveal delay={90}>
              <Card style={styles.toggleCard} elevated="md">
                <SectionHeader title="Tipo de publicación" />
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.modeCard, tripType === 'single' && styles.modeCardActive]}
                    activeOpacity={0.88}
                    onPress={() => setTripType('single')}
                    accessibilityHint="Configura una salida para una sola fecha."
                    accessibilityState={{ selected: tripType === 'single' }}
                    accessibilityRole="button"
                    accessibilityLabel="Publicar viaje único"
                  >
                    <View style={[styles.modeIconWrap, tripType === 'single' && styles.modeIconWrapActive]}>
                      <Icon
                        name="calendar"
                        size={18}
                        color={tripType === 'single' ? theme.colors.icon.brand : theme.colors.icon.secondary}
                      />
                    </View>
                    <Text style={[styles.modeTitle, tripType === 'single' && styles.modeTitleActive]}>Viaje único</Text>
                    <Text style={styles.modeDescription}>Una fecha puntual con horario específico.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeCard, tripType === 'recurring' && styles.modeCardActive]}
                    activeOpacity={0.88}
                    onPress={() => setTripType('recurring')}
                    accessibilityHint="Configura una ruta que se repite en dias fijos."
                    accessibilityState={{ selected: tripType === 'recurring' }}
                    accessibilityRole="button"
                    accessibilityLabel="Publicar viaje recurrente"
                  >
                    <View style={[styles.modeIconWrap, tripType === 'recurring' && styles.modeIconWrapActive]}>
                      <Icon
                        name="repeat"
                        size={18}
                        color={tripType === 'recurring' ? theme.colors.icon.brand : theme.colors.icon.secondary}
                      />
                    </View>
                    <Text style={[styles.modeTitle, tripType === 'recurring' && styles.modeTitleActive]}>Recurrente</Text>
                    <Text style={styles.modeDescription}>Misma ruta en días fijos cada semana.</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </Reveal>

            <Reveal delay={130}>
              <Card style={styles.formCard}>
                <SectionHeader title="Ruta" />
                <Input
                  label="Ciudad de origen"
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="Ej: Mercedes"
                  leadingIcon="map-pin"
                />
                <Input
                  label="Ciudad de destino"
                  value={dest}
                  onChangeText={setDest}
                  placeholder="Ej: Buenos Aires"
                  leadingIcon="navigation"
                />
              </Card>
            </Reveal>

            <Reveal delay={170}>
              <Card style={styles.formCard}>
                <SectionHeader title={tripType === 'single' ? 'Fecha y horario' : 'Recurrencia'} />
                {tripType === 'single' ? (
                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Input
                        label="Fecha"
                        value={date}
                        onChangeText={setDate}
                        placeholder="DD/MM/AAAA"
                        leadingIcon="calendar"
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Input
                        label="Hora de salida"
                        value={time}
                        onChangeText={setTime}
                        placeholder="07:00"
                        leadingIcon="clock"
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.daysHint}>{selectedDaysLabel}</Text>
                    <View style={styles.daysRow}>
                      {DAYS.map((day, index) => {
                        const active = days.includes(index)
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[styles.dayChip, active && styles.dayChipActive]}
                            activeOpacity={0.86}
                            onPress={() => toggleDay(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Seleccionar ${day}`}
                            accessibilityHint={active ? `Quita ${day} de la recurrencia.` : `Agrega ${day} a la recurrencia.`}
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                    <Input
                      label="Hora habitual de salida"
                      value={time}
                      onChangeText={setTime}
                      placeholder="07:00"
                      leadingIcon="clock"
                    />
                  </>
                )}
              </Card>
            </Reveal>

            <Reveal delay={210}>
              <Card style={styles.formCard}>
                <SectionHeader title="Capacidad para pasajeros" />
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Input
                      label="Asientos disponibles"
                      value={seats}
                      onChangeText={setSeats}
                      keyboardType="numeric"
                      placeholder="0"
                      leadingIcon="users"
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Input
                      label="Precio por asiento"
                      value={priceS}
                      onChangeText={setPriceS}
                      keyboardType="numeric"
                      placeholder="8000"
                      leadingIcon="dollar-sign"
                    />
                  </View>
                </View>
              </Card>
            </Reveal>

            <Reveal delay={250}>
              <Card style={styles.formCard}>
                <SectionHeader title="Capacidad para encomiendas" />
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Input
                      label="Capacidad total (kg)"
                      value={kg}
                      onChangeText={setKg}
                      keyboardType="numeric"
                      placeholder="0"
                      leadingIcon="package"
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Input
                      label="Precio por kilo"
                      value={priceKg}
                      onChangeText={setPriceKg}
                      keyboardType="numeric"
                      placeholder="500"
                      leadingIcon="dollar-sign"
                    />
                  </View>
                </View>
              </Card>
            </Reveal>

            <Reveal delay={290}>
              <Card style={styles.formCard}>
                <SectionHeader title="Notas y condiciones" />
                <Input
                  label="Mensaje opcional"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ej: retiro por el centro, paso por autopista, viajo con valijas."
                  multiline
                  numberOfLines={4}
                />
                <View style={styles.infoBanner}>
                  <View style={styles.infoIconWrap}>
                    <Icon name="shield" size={18} color={theme.colors.icon.success} />
                  </View>
                  <Text style={styles.infoText}>
                    Los pagos quedan en custodia hasta que confirmes el viaje o la entrega. Esto protege a ambas partes.
                  </Text>
                </View>
              </Card>
            </Reveal>

            <Reveal delay={330}>
              <Card style={styles.summaryCard} elevated="md">
                <SectionHeader title="Resumen estimado" />
                <View style={styles.summaryRoute}>
                  <Text style={styles.summaryRouteTitle}>
                    {origin || 'Origen'} → {dest || 'Destino'}
                  </Text>
                  <Text style={styles.summaryRouteMeta}>
                    {tripType === 'single'
                      ? date && time
                        ? `${date} · ${time}`
                        : 'Completá fecha y hora'
                      : time
                        ? `${selectedDaysLabel} · ${time}`
                        : selectedDaysLabel}
                  </Text>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Ingreso bruto</Text>
                    <Text style={styles.summaryValue}>${grossRevenue.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Comisión estimada</Text>
                    <Text style={styles.summaryMuted}>-${commission.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Ingreso neto</Text>
                    <Text style={styles.summaryNet}>${netRevenue.toLocaleString()}</Text>
                  </View>
                </View>

                <Button
                  label="Publicar viaje"
                  onPress={handlePublish}
                  loading={loading}
                  variant="secondary"
                  rightIcon="arrow-right"
                />
              </Card>
            </Reveal>
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
    gap: theme.spacing.md,
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
  eyebrow: {
    ...theme.textStyles.label,
    color: theme.colors.action.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...theme.textStyles.h1,
    color: theme.colors.text.inverse,
  },
  subtitle: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.74)',
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
  },
  heroPillText: {
    ...theme.textStyles.caption,
    color: theme.colors.text.inverse,
  },
  body: {
    gap: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    marginTop: -24,
  },
  toggleCard: {
    gap: theme.spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modeCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.elevated,
  },
  modeCardActive: {
    borderColor: theme.colors.text.brand,
    backgroundColor: theme.colors.background.brandSoft,
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    marginBottom: theme.spacing.md,
  },
  modeIconWrapActive: {
    backgroundColor: theme.colors.background.surface,
  },
  modeTitle: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  modeTitleActive: {
    color: theme.colors.text.brand,
  },
  modeDescription: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  formCard: {
    gap: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  daysHint: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  dayChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.app,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  dayChipActive: {
    backgroundColor: theme.colors.background.brand,
    borderColor: theme.colors.background.brand,
  },
  dayChipText: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  dayChipTextActive: {
    color: theme.colors.text.inverse,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.successSoft,
    padding: theme.spacing.lg,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  infoText: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  summaryCard: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  summaryRoute: {
    gap: 4,
  },
  summaryRouteTitle: {
    ...theme.textStyles.h3,
    color: theme.colors.text.primary,
  },
  summaryRouteMeta: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
  },
  summaryGrid: {
    gap: theme.spacing.md,
  },
  summaryItem: {
    gap: 2,
  },
  summaryLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  summaryValue: {
    ...theme.textStyles.title,
    color: theme.colors.text.primary,
  },
  summaryMuted: {
    ...theme.textStyles.title,
    color: theme.colors.text.secondary,
  },
  summaryNet: {
    ...theme.textStyles.h3,
    color: theme.colors.text.brand,
  },
})
