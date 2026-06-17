import { Ionicons } from '@expo/vector-icons'
import * as ExpoLinking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Button } from '../../components/ui/Button'
import { CityPicker } from '../../components/ui/CityPicker'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Theme } from '../../constants/theme'
import type { DriverMode, DriverVerificationStatus } from '../../lib/auth'
import { useAuth } from '../../lib/auth'
import { getDriverModeMeta } from '../../lib/driver'
import { api } from '../../lib/api'

type DayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
type VehicleType = 'MOTO' | 'AUTO' | 'CAMIONETA' | 'CAMION'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'MONDAY', label: 'L' },
  { key: 'TUESDAY', label: 'M' },
  { key: 'WEDNESDAY', label: 'X' },
  { key: 'THURSDAY', label: 'J' },
  { key: 'FRIDAY', label: 'V' },
  { key: 'SATURDAY', label: 'S' },
  { key: 'SUNDAY', label: 'D' },
]

const VEHICLE_OPTIONS: { key: VehicleType; label: string }[] = [
  { key: 'AUTO', label: 'Auto' },
  { key: 'CAMIONETA', label: 'Camioneta' },
  { key: 'CAMION', label: 'Camión' },
  { key: 'MOTO', label: 'Moto' },
]

function parseDriverMode(value: string | string[] | undefined): DriverMode | null {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (rawValue === 'rider' || rawValue === 'viajes' || rawValue === 'entrega') return rawValue
  return null
}

export default function DriverSetupScreen() {
  const { mode: modeParam, addingRoute } = useLocalSearchParams<{ mode?: string | string[]; addingRoute?: string }>()
  const { user, driverProfile, saveDriverProfile, token, startDriverVerification, syncDriverVerification } = useAuth()
  const isAddingRoute = addingRoute === '1'
  const mode = useMemo(() => isAddingRoute ? 'entrega' : parseDriverMode(modeParam), [modeParam, isAddingRoute])
  const currentProfile = mode && driverProfile?.mode === mode ? driverProfile : null

  // Campos genéricos (rider / viajes)
  const [city, setCity] = useState(currentProfile?.city ?? user?.city ?? '')
  const [vehicle, setVehicle] = useState(currentProfile?.vehicle ?? '')
  const [coverage, setCoverage] = useState(currentProfile?.coverage ?? '')
  const [availability, setAvailability] = useState(currentProfile?.availability ?? '')
  const [notes, setNotes] = useState(currentProfile?.notes ?? '')

  // Campos estructurados solo para entrega
  const [originCity, setOriginCity] = useState('')
  const [destinationCity, setDestinationCity] = useState('')
  const [waypointCities, setWaypointCities] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<DayKey[]>([])
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null)
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [maxWeightKg, setMaxWeightKg] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationSyncing, setVerificationSyncing] = useState(false)
  const [verificationNote, setVerificationNote] = useState<string | null>(null)

  useEffect(() => {
    if (!isAddingRoute && !mode) router.replace('/driver')
  }, [mode, isAddingRoute])

  useEffect(() => {
    if (!isAddingRoute && token && user?.driverVerificationSessionId && user.driverVerificationStatus !== 'APPROVED') {
      void (async () => {
        try {
          const status = await syncDriverVerification(true)
          setVerificationNote(status?.notes ?? null)
        } catch {}
      })()
    }
  }, [isAddingRoute, token, syncDriverVerification, user?.driverVerificationSessionId, user?.driverVerificationStatus])

  if (!isAddingRoute && !mode) return null

  const effectiveMode = mode ?? 'entrega'
  const meta = getDriverModeMeta(effectiveMode)
  const isEntrega = effectiveMode === 'entrega'
  const driverVerificationApproved = user?.driverVerificationStatus === 'APPROVED'
  const hasDriverVerificationSession = Boolean(user?.driverVerificationSessionId)

  function getVerificationStatusCopy(status?: DriverVerificationStatus) {
    switch (status) {
      case 'APPROVED':
        return 'Aprobada'
      case 'IN_REVIEW':
        return 'En revision'
      case 'DECLINED':
        return 'Rechazada'
      case 'RESUBMITTED':
        return 'Repetir pasos'
      case 'EXPIRED':
        return 'Vencida'
      case 'ABANDONED':
        return 'Incompleta'
      case 'KYC_EXPIRED':
        return 'Vencida por KYC'
      case 'IN_PROGRESS':
        return 'En proceso'
      case 'PENDING':
        return 'Lista para iniciar'
      default:
        return 'Pendiente'
    }
  }

  function toggleDay(key: DayKey) {
    setSelectedDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  function validateEntrega(): string | null {
    if (!originCity.trim()) return 'Ingresá la ciudad de origen.'
    if (!destinationCity.trim()) return 'Ingresá la ciudad de destino.'
    if (selectedDays.length === 0) return 'Seleccioná al menos un día.'
    if (!vehicleType) return 'Seleccioná el tipo de vehículo.'
    const kg = parseFloat(maxWeightKg)
    if (!maxWeightKg || !Number.isFinite(kg) || kg <= 0) return 'Ingresá el peso máximo en kg.'
    return null
  }

  function validateGeneric(): string | null {
    if (!city.trim()) return 'Completá tu ciudad base.'
    if (!vehicle.trim()) return `Completá ${meta.vehicleLabel.toLowerCase()}.`
    if (!coverage.trim()) return `Completá ${meta.coverageLabel.toLowerCase()}.`
    if (!availability.trim()) return `Completá ${meta.availabilityLabel.toLowerCase()}.`
    return null
  }

  async function handleSubmit() {
    if (!mode) return
    if (!isAddingRoute && !driverVerificationApproved) {
      setError('Debes completar la verificacion de conductor con Didit antes de continuar.')
      return
    }

    const validationError = isEntrega ? validateEntrega() : validateGeneric()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isEntrega && token) {
        await api.post('/drivers/routes', {
          originCity: originCity.trim(),
          destinationCity: destinationCity.trim(),
          waypointCities: waypointCities.filter(c => c.trim().length > 0),
          daysOfWeek: selectedDays,
          vehicleType,
          licensePlate: licensePlate.trim() || undefined,
          vehicleModel: vehicleModel.trim() || undefined,
          vehicleColor: vehicleColor.trim() || undefined,
          maxWeightKg: parseFloat(maxWeightKg),
          pricePerKg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        }, token)
      }

      if (!isAddingRoute && mode) {
        await saveDriverProfile({
          mode,
          city: isEntrega ? originCity.trim() : city.trim(),
          vehicle: isEntrega ? (vehicleType ?? '') : vehicle.trim(),
          coverage: isEntrega ? destinationCity.trim() : coverage.trim(),
          availability: isEntrega ? selectedDays.join(', ') : availability.trim(),
          notes: notes.trim(),
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        })
      }

      router.replace('/driver/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStartVerification() {
    if (isAddingRoute) return

    setVerificationBusy(true)
    setError(null)
    try {
      const callbackUrl = ExpoLinking.createURL('/driver/verify', {
        queryParams: { mode: effectiveMode },
      })
      const session = await startDriverVerification(callbackUrl)
      if (session.alreadyVerified) {
        setVerificationNote('Tu verificacion ya figura aprobada en Didit.')
        await handleSyncVerification(false)
        return
      }

      if (!session.verificationUrl) {
        throw new Error('Didit no devolvio una URL para continuar la verificacion.')
      }

      setVerificationNote('Se abrio tu sesion de verificacion en Didit.')
      await Linking.openURL(session.verificationUrl)
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'No pude iniciar la verificacion con Didit.')
    } finally {
      setVerificationBusy(false)
    }
  }

  async function handleSyncVerification(showLoader = true) {
    if (isAddingRoute) return

    if (showLoader) setVerificationSyncing(true)
    setError(null)
    try {
      const status = await syncDriverVerification(true)
      setVerificationNote(status?.notes ?? null)
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'No pude actualizar el estado de Didit.')
    } finally {
      if (showLoader) setVerificationSyncing(false)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.replace(isAddingRoute ? '/driver/home' : '/driver')} />
        <View style={styles.headerCopy}>
          <Text style={styles.step}>{isAddingRoute ? 'Mis rutas' : 'Paso 2 de 3'}</Text>
          <Text style={styles.headerTitle}>{isAddingRoute ? 'Nueva ruta' : 'Configurar perfil'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name={meta.icon} size={18} color={Theme.colors.black} />
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
          <Text style={styles.title}>{meta.setupTitle}</Text>
          <Text style={styles.description}>{meta.setupDescription}</Text>
        </View>

        {!isAddingRoute ? (
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <View>
                <Text style={styles.verificationEyebrow}>Paso obligatorio</Text>
                <Text style={styles.verificationTitle}>Verificacion Didit</Text>
              </View>
              <View style={[styles.statusPill, driverVerificationApproved && styles.statusPillApproved]}>
                <Text style={[styles.statusPillText, driverVerificationApproved && styles.statusPillTextApproved]}>
                  {getVerificationStatusCopy(user?.driverVerificationStatus)}
                </Text>
              </View>
            </View>

            <Text style={styles.verificationText}>
              {verificationNote
                ?? 'Antes de habilitar rutas o viajes como conductor, debes completar la verificacion de identidad con Didit.'}
            </Text>

            {user?.phoneVerifiedAt ? null : (
              <View style={styles.inlineAlert}>
                <Ionicons name="alert-circle" size={15} color={Theme.colors.danger} />
                <Text style={styles.inlineAlertText}>Tu telefono todavia no figura verificado. Completa el alta por SMS antes de seguir.</Text>
              </View>
            )}

            <View style={styles.verificationActions}>
              <Button
                label={
                  driverVerificationApproved
                    ? 'Verificacion aprobada'
                    : hasDriverVerificationSession
                      ? 'Abrir Didit'
                      : 'Iniciar con Didit'
                }
                onPress={() => void handleStartVerification()}
                loading={verificationBusy}
                disabled={driverVerificationApproved || !user?.phoneVerifiedAt}
                style={styles.verificationPrimaryBtn}
              />
              <Button
                label="Actualizar estado"
                variant="secondary"
                onPress={() => void handleSyncVerification()}
                loading={verificationSyncing}
                style={styles.verificationSecondaryBtn}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.form}>
          {isEntrega ? (
            <>
              <CityPicker
                label="Ciudad de origen *"
                value={originCity}
                onChangeCity={setOriginCity}
                placeholder="Ej: Buenos Aires"
              />
              <CityPicker
                label="Ciudad de destino *"
                value={destinationCity}
                onChangeCity={setDestinationCity}
                placeholder="Ej: Córdoba"
              />

              <Text style={styles.fieldLabel}>Paradas intermedias (opcional)</Text>
              {waypointCities.map((city, idx) => (
                <View key={idx} style={styles.waypointRow}>
                  <View style={styles.waypointPicker}>
                    <CityPicker
                      value={city}
                      onChangeCity={val => {
                        const next = [...waypointCities]
                        next[idx] = val
                        setWaypointCities(next)
                      }}
                      placeholder="Ej: Rosario"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.removeWaypoint}
                    onPress={() => setWaypointCities(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Ionicons name="close-circle" size={22} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addWaypointBtn}
                activeOpacity={0.8}
                onPress={() => setWaypointCities(prev => [...prev, ''])}
              >
                <Ionicons name="add-circle-outline" size={18} color={Theme.colors.lime} />
                <Text style={styles.addWaypointText}>Agregar parada</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Días que viajás *</Text>
              <View style={styles.daysRow}>
                {DAYS.map(day => {
                  const active = selectedDays.includes(day.key)
                  return (
                    <TouchableOpacity
                      key={day.key}
                      activeOpacity={0.8}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => toggleDay(day.key)}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.fieldLabel}>Tipo de vehículo *</Text>
              <View style={styles.vehicleGrid}>
                {VEHICLE_OPTIONS.map(v => {
                  const active = vehicleType === v.key
                  return (
                    <TouchableOpacity
                      key={v.key}
                      activeOpacity={0.8}
                      style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                      onPress={() => setVehicleType(v.key)}
                    >
                      <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>
                        {v.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Input
                label="Patente *"
                value={licensePlate}
                onChangeText={setLicensePlate}
                placeholder="ABC 123"
                autoCapitalize="characters"
              />
              <Input
                label="Modelo del vehículo (opcional)"
                value={vehicleModel}
                onChangeText={setVehicleModel}
                placeholder="Renault Logan"
                autoCapitalize="words"
              />
              <Input
                label="Color del vehículo (opcional)"
                value={vehicleColor}
                onChangeText={setVehicleColor}
                placeholder="Blanco"
                autoCapitalize="words"
              />

              <Input
                label="Peso máximo que llevás (kg) *"
                value={maxWeightKg}
                onChangeText={setMaxWeightKg}
                placeholder="20"
                keyboardType="decimal-pad"
              />
              <Input
                label="Precio por kg (opcional)"
                value={pricePerKg}
                onChangeText={setPricePerKg}
                placeholder="150"
                keyboardType="decimal-pad"
              />
            </>
          ) : (
            <>
              <Input
                label="Ciudad base"
                value={city}
                onChangeText={setCity}
                placeholder="Buenos Aires"
                autoCapitalize="words"
              />
              <Input
                label={meta.vehicleLabel}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder={meta.vehiclePlaceholder}
                autoCapitalize="sentences"
              />
              <Input
                label={meta.coverageLabel}
                value={coverage}
                onChangeText={setCoverage}
                placeholder={meta.coveragePlaceholder}
                autoCapitalize="sentences"
              />
              <Input
                label={meta.availabilityLabel}
                value={availability}
                onChangeText={setAvailability}
                placeholder={meta.availabilityPlaceholder}
                autoCapitalize="sentences"
              />
            </>
          )}

          <Input
            label="Notas opcionales"
            value={notes}
            onChangeText={setNotes}
            placeholder="Algo que quieras aclarar sobre tu operacion"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Continuar"
          onPress={() => void handleSubmit()}
          loading={saving}
          disabled={!isAddingRoute && !driverVerificationApproved}
        />
      </ScrollView>
    </ScreenSafeArea>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  headerCopy: { flex: 1 },
  step: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 16,
    marginTop: 4,
  },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  badge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.lime,
  },
  badgeText: { color: Theme.colors.black, fontFamily: Theme.fonts.bold, fontSize: 12 },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 27,
    lineHeight: 31,
    marginTop: 14,
  },
  description: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  verificationCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 12,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  verificationEyebrow: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  verificationTitle: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 18,
    marginTop: 4,
  },
  verificationText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
  },
  statusPill: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statusPillApproved: {
    backgroundColor: Theme.colors.lime,
    borderColor: Theme.colors.lime,
  },
  statusPillText: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
  },
  statusPillTextApproved: {
    color: Theme.colors.black,
  },
  inlineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.dangerSurface,
  },
  inlineAlertText: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  verificationActions: {
    gap: 10,
  },
  verificationPrimaryBtn: {
    marginTop: 2,
  },
  verificationSecondaryBtn: {
    marginTop: 0,
  },
  form: { marginTop: 20 },
  fieldLabel: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  daysRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dayChipActive: { backgroundColor: Theme.colors.lime, borderColor: Theme.colors.lime },
  dayChipText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.bold, fontSize: 13 },
  dayChipTextActive: { color: Theme.colors.black },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  vehicleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  vehicleChipActive: { backgroundColor: Theme.colors.lime, borderColor: Theme.colors.lime },
  vehicleChipText: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.semiBold, fontSize: 13 },
  vehicleChipTextActive: { color: Theme.colors.black },
  notesInput: { minHeight: 108, paddingTop: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: Theme.colors.dangerSurface,
  },
  errorText: {
    flex: 1,
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: -8,
  },
  waypointPicker: { flex: 1 },
  removeWaypoint: {
    paddingTop: 13,
  },
  addWaypointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 20,
  },
  addWaypointText: {
    color: Theme.colors.lime,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
})
