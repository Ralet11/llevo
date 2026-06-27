import { Ionicons } from '@expo/vector-icons'
import * as ExpoLinking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
type RouteKind = 'INTERCITY' | 'LOCAL'
type StepKey = 'verify' | 'mode' | 'route' | 'vehicle' | 'capacity' | 'review' | 'basics' | 'coverage'

// Solo para dev/QA: saltea el paso de verificacion (telefono + Didit) del wizard.
// Combinar con DIDIT_BYPASS_VERIFICATION=true en el backend. Default: false.
const SKIP_DRIVER_VERIFICATION = process.env.EXPO_PUBLIC_SKIP_DRIVER_VERIFICATION === 'true'

const STEP_TITLES: Record<StepKey, { title: string; subtitle: string }> = {
  verify: { title: 'Verificación', subtitle: 'Confirmá tu teléfono e identidad antes de poder operar.' },
  mode: { title: '¿Cómo querés repartir?', subtitle: 'Podés cambiarlo o sumar el otro tipo más adelante.' },
  route: { title: 'Tu ruta', subtitle: 'Definí desde dónde, hasta dónde y qué días viajás.' },
  vehicle: { title: 'Tu vehículo', subtitle: 'Contanos con qué vas a transportar.' },
  capacity: { title: 'Capacidad y precio', subtitle: 'Cuánto podés llevar y a qué precio.' },
  review: { title: 'Revisión final', subtitle: 'Revisá los datos y confirmá tu perfil.' },
  basics: { title: 'Datos base', subtitle: 'Tu ciudad y con qué te movés.' },
  coverage: { title: 'Cobertura', subtitle: 'Hasta dónde llegás y cuándo estás disponible.' },
}

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

function parseRouteKind(value: string | string[] | undefined): RouteKind | null {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (rawValue === 'LOCAL' || rawValue === 'INTERCITY') return rawValue
  return null
}

export default function DriverSetupScreen() {
  const { mode: modeParam, addingRoute, kind: kindParam } = useLocalSearchParams<{ mode?: string | string[]; addingRoute?: string; kind?: string }>()
  // Si viene un kind preseteado (desde el nudge del home), salteamos el paso de seleccion.
  const presetKind = parseRouteKind(kindParam)
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
  // Tipo de ruta de entrega: entre ciudades o local (dentro de una ciudad).
  const [routeKind, setRouteKind] = useState<RouteKind>(presetKind ?? 'INTERCITY')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationSyncing, setVerificationSyncing] = useState(false)
  const [verificationNote, setVerificationNote] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  // Pasos del wizard segun el modo. Entrega usa campos estructurados; rider/viajes
  // usan campos genericos. Al agregar una ruta nueva no se re-verifica identidad.
  const steps = useMemo<StepKey[]>(() => {
    const entrega = (mode ?? 'entrega') === 'entrega'
    const skipVerify = isAddingRoute || SKIP_DRIVER_VERIFICATION
    // Con kind preseteado no mostramos el paso de seleccion de tipo.
    const entregaBase: StepKey[] = presetKind
      ? ['route', 'vehicle', 'capacity', 'review']
      : ['mode', 'route', 'vehicle', 'capacity', 'review']
    const base: StepKey[] = entrega ? entregaBase : ['basics', 'coverage', 'review']
    return skipVerify ? base : ['verify', ...base]
  }, [mode, isAddingRoute, presetKind])

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
  const verificationOk = driverVerificationApproved || SKIP_DRIVER_VERIFICATION
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
    if (routeKind === 'LOCAL') {
      if (!originCity.trim()) return 'Ingresá tu ciudad de operación.'
    } else {
      if (!originCity.trim()) return 'Ingresá la ciudad de origen.'
      if (!destinationCity.trim()) return 'Ingresá la ciudad de destino.'
      if (selectedDays.length === 0) return 'Seleccioná al menos un día.'
    }
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
    if (!isAddingRoute && !verificationOk) {
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
        const commonRoute = {
          vehicleType,
          licensePlate: licensePlate.trim() || undefined,
          vehicleModel: vehicleModel.trim() || undefined,
          vehicleColor: vehicleColor.trim() || undefined,
          maxWeightKg: parseFloat(maxWeightKg),
          pricePerKg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        }
        const routePayload = routeKind === 'LOCAL'
          ? { kind: 'LOCAL', city: originCity.trim(), ...commonRoute }
          : {
              kind: 'INTERCITY',
              originCity: originCity.trim(),
              destinationCity: destinationCity.trim(),
              waypointCities: waypointCities.filter(c => c.trim().length > 0),
              daysOfWeek: selectedDays,
              ...commonRoute,
            }
        await api.post('/drivers/routes', routePayload, token)
      }

      if (!isAddingRoute && mode) {
        const isLocal = isEntrega && routeKind === 'LOCAL'
        await saveDriverProfile({
          mode,
          city: isEntrega ? originCity.trim() : city.trim(),
          vehicle: isEntrega ? (vehicleType ?? '') : vehicle.trim(),
          coverage: isEntrega ? (isLocal ? originCity.trim() : destinationCity.trim()) : coverage.trim(),
          availability: isEntrega ? (isLocal ? 'Envíos locales' : selectedDays.join(', ')) : availability.trim(),
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

  const currentStepKey = steps[Math.min(step, steps.length - 1)]
  const isLastStep = step >= steps.length - 1
  // El paso de ruta cambia de titulo segun el tipo (local vs entre ciudades).
  const heading = currentStepKey === 'route' && routeKind === 'LOCAL'
    ? { title: 'Tu ciudad', subtitle: '¿En qué ciudad vas a hacer repartos?' }
    : STEP_TITLES[currentStepKey]

  // Valida solo los campos del paso actual antes de avanzar.
  function validateStep(key: StepKey): string | null {
    switch (key) {
      case 'verify':
        if (!verificationOk) return 'Completá la verificación de conductor con Didit antes de continuar.'
        return null
      case 'route':
        if (routeKind === 'LOCAL') {
          if (!originCity.trim()) return 'Ingresá tu ciudad de operación.'
          return null
        }
        if (!originCity.trim()) return 'Ingresá la ciudad de origen.'
        if (!destinationCity.trim()) return 'Ingresá la ciudad de destino.'
        if (selectedDays.length === 0) return 'Seleccioná al menos un día.'
        return null
      case 'vehicle':
        if (!vehicleType) return 'Seleccioná el tipo de vehículo.'
        return null
      case 'capacity': {
        const kg = parseFloat(maxWeightKg)
        if (!maxWeightKg || !Number.isFinite(kg) || kg <= 0) return 'Ingresá el peso máximo en kg.'
        return null
      }
      case 'basics':
        if (!city.trim()) return 'Completá tu ciudad base.'
        if (!vehicle.trim()) return `Completá ${meta.vehicleLabel.toLowerCase()}.`
        return null
      case 'coverage':
        if (!coverage.trim()) return `Completá ${meta.coverageLabel.toLowerCase()}.`
        if (!availability.trim()) return `Completá ${meta.availabilityLabel.toLowerCase()}.`
        return null
      default:
        return null
    }
  }

  async function goNext() {
    const validationError = validateStep(currentStepKey)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    if (isLastStep) {
      await handleSubmit()
    } else {
      setStep(prev => prev + 1)
    }
  }

  function goBack() {
    setError(null)
    if (step === 0) {
      router.replace(isAddingRoute ? '/driver/home' : '/driver')
    } else {
      setStep(prev => prev - 1)
    }
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={goBack} />
        <View style={styles.headerCopy}>
          <Text style={styles.step}>Paso {step + 1} de {steps.length}</Text>
          <Text style={styles.headerTitle}>{isAddingRoute ? 'Nueva ruta' : 'Configurar perfil'}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {steps.map((key, idx) => (
          <View
            key={key}
            style={[
              styles.progressSegment,
              idx < step && styles.progressSegmentDone,
              idx === step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name={meta.icon} size={18} color={Theme.colors.black} />
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
          <Text style={styles.title}>{heading.title}</Text>
          <Text style={styles.description}>{heading.subtitle}</Text>
        </View>

        {currentStepKey === 'verify' ? (
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
                <View style={styles.inlineAlertBody}>
                  <Text style={styles.inlineAlertText}>Tu telefono todavia no figura verificado. Completalo por SMS antes de seguir.</Text>
                  <TouchableOpacity
                    style={styles.inlineAlertBtn}
                    activeOpacity={0.8}
                    onPress={() => router.push('/verify-phone')}
                  >
                    <Ionicons name="phone-portrait" size={14} color={Theme.colors.black} />
                    <Text style={styles.inlineAlertBtnText}>Verificar mi telefono</Text>
                  </TouchableOpacity>
                </View>
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

        {currentStepKey === 'mode' ? (
          <View style={styles.form}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.modeCard, routeKind === 'LOCAL' && styles.modeCardActive]}
              onPress={() => setRouteKind('LOCAL')}
            >
              <View style={styles.modeIcon}>
                <Ionicons name="business" size={22} color={Theme.colors.black} />
              </View>
              <View style={styles.modeBody}>
                <Text style={styles.modeTitle}>Dentro de mi ciudad</Text>
                <Text style={styles.modeDesc}>Repartos locales. Te ponés online y recibís envíos al instante.</Text>
              </View>
              {routeKind === 'LOCAL'
                ? <Ionicons name="checkmark-circle" size={22} color={Theme.colors.lime} />
                : <View style={styles.modeRadio} />}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.modeCard, routeKind === 'INTERCITY' && styles.modeCardActive]}
              onPress={() => setRouteKind('INTERCITY')}
            >
              <View style={styles.modeIcon}>
                <Ionicons name="navigate" size={22} color={Theme.colors.black} />
              </View>
              <View style={styles.modeBody}>
                <Text style={styles.modeTitle}>Entre ciudades</Text>
                <Text style={styles.modeDesc}>Rutas programadas A → B en los días que viajás.</Text>
              </View>
              {routeKind === 'INTERCITY'
                ? <Ionicons name="checkmark-circle" size={22} color={Theme.colors.lime} />
                : <View style={styles.modeRadio} />}
            </TouchableOpacity>

            <Text style={styles.modeHint}>Después podés sumar el otro tipo desde "Mis rutas".</Text>
          </View>
        ) : null}

        {currentStepKey === 'route' && routeKind === 'LOCAL' ? (
          <View style={styles.form}>
            <CityPicker
              label="Ciudad de operación *"
              value={originCity}
              onChangeCity={setOriginCity}
              placeholder="Ej: Buenos Aires"
            />
            <Text style={styles.modeHint}>Vas a recibir envíos dentro de esta ciudad cuando estés online.</Text>
          </View>
        ) : null}

        {currentStepKey === 'route' && routeKind === 'INTERCITY' ? (
          <View style={styles.form}>
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
            {waypointCities.map((cityValue, idx) => (
              <View key={idx} style={styles.waypointRow}>
                <View style={styles.waypointPicker}>
                  <CityPicker
                    value={cityValue}
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
          </View>
        ) : null}

        {currentStepKey === 'vehicle' ? (
          <View style={styles.form}>
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
          </View>
        ) : null}

        {currentStepKey === 'capacity' ? (
          <View style={styles.form}>
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
          </View>
        ) : null}

        {currentStepKey === 'basics' ? (
          <View style={styles.form}>
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
          </View>
        ) : null}

        {currentStepKey === 'coverage' ? (
          <View style={styles.form}>
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
          </View>
        ) : null}

        {currentStepKey === 'review' ? (
          <View style={styles.form}>
            <View style={styles.summaryCard}>
              {isEntrega && routeKind === 'LOCAL' ? (
                <>
                  <SummaryRow label="Tipo" value="Envíos locales" />
                  <SummaryRow label="Ciudad" value={originCity || '—'} />
                  <SummaryRow label="Vehículo" value={vehicleType ?? '—'} />
                  {licensePlate.trim() ? <SummaryRow label="Patente" value={licensePlate.trim()} /> : null}
                  <SummaryRow label="Peso máximo" value={maxWeightKg ? `${maxWeightKg} kg` : '—'} />
                  {pricePerKg.trim() ? <SummaryRow label="Precio por kg" value={pricePerKg.trim()} /> : null}
                </>
              ) : isEntrega ? (
                <>
                  <SummaryRow label="Ruta" value={`${originCity || '—'} → ${destinationCity || '—'}`} />
                  {waypointCities.filter(c => c.trim()).length > 0 ? (
                    <SummaryRow label="Paradas" value={waypointCities.filter(c => c.trim()).join(', ')} />
                  ) : null}
                  <SummaryRow label="Días" value={selectedDays.length ? selectedDays.join(', ') : '—'} />
                  <SummaryRow label="Vehículo" value={vehicleType ?? '—'} />
                  {licensePlate.trim() ? <SummaryRow label="Patente" value={licensePlate.trim()} /> : null}
                  <SummaryRow label="Peso máximo" value={maxWeightKg ? `${maxWeightKg} kg` : '—'} />
                  {pricePerKg.trim() ? <SummaryRow label="Precio por kg" value={pricePerKg.trim()} /> : null}
                </>
              ) : (
                <>
                  <SummaryRow label="Ciudad base" value={city || '—'} />
                  <SummaryRow label={meta.vehicleLabel} value={vehicle || '—'} />
                  <SummaryRow label={meta.coverageLabel} value={coverage || '—'} />
                  <SummaryRow label={meta.availabilityLabel} value={availability || '—'} />
                </>
              )}
            </View>

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
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={step === 0 ? 'Cancelar' : 'Atrás'}
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.footerBack}
        />
        <Button
          label={isLastStep ? 'Finalizar' : 'Continuar'}
          onPress={() => void goNext()}
          loading={saving}
          disabled={currentStepKey === 'verify' && !verificationOk}
          fullWidth={false}
          style={styles.footerNext}
        />
      </View>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  flex: { flex: 1 },
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
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.border,
  },
  progressSegmentDone: {
    backgroundColor: Theme.colors.lime,
  },
  progressSegmentActive: {
    backgroundColor: Theme.colors.lime,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  footerBack: {
    flex: 1,
  },
  footerNext: {
    flex: 2,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    marginBottom: 12,
  },
  modeCardActive: {
    borderColor: Theme.colors.lime,
    backgroundColor: Theme.colors.surfaceElevated,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.lime,
  },
  modeBody: { flex: 1, gap: 3 },
  modeTitle: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 15 },
  modeDesc: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 17 },
  modeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Theme.colors.border,
  },
  modeHint: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    color: Theme.colors.textSubtle,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    color: Theme.colors.text,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 13,
  },
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
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.dangerSurface,
  },
  inlineAlertBody: {
    flex: 1,
    gap: 10,
  },
  inlineAlertText: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineAlertBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Theme.colors.lime,
  },
  inlineAlertBtnText: {
    color: Theme.colors.black,
    fontFamily: Theme.fonts.bold,
    fontSize: 12,
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
