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
import { themedStyles } from '../../lib/theme'
import type { DriverMode, DriverVerificationStatus } from '../../lib/auth'
import { useAuth } from '../../lib/auth'
import { getDriverModeMeta } from '../../lib/driver'
import { api } from '../../lib/api'
import { createVehicle, fetchVehicles, VEHICLE_TYPE_LABELS, type Vehicle } from '../../lib/vehicles'

type DayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
type VehicleType = 'MOTO' | 'AUTO' | 'CAMIONETA' | 'CAMION'
type RouteKind = 'INTERCITY' | 'LOCAL'
type StepKey = 'verify' | 'mode' | 'route' | 'vehicle' | 'capacity' | 'passengers' | 'review' | 'basics' | 'coverage'

type StoredDriverRoute = {
  id: string
  kind: RouteKind
  originCity: string
  destinationCity: string
  waypointCities: string[]
  daysOfWeek: DayKey[]
  departureTimeFrom?: string | null
  departureTimeTo?: string | null
  vehicleType: VehicleType
  licensePlate?: string | null
  vehicleModel?: string | null
  vehicleColor?: string | null
  maxWeightKg: number
  pricePerKg?: number | null
  vehicleId?: string | null
  carriesPassengers: boolean
  seatsOffered?: number | null
  pricePerSeat?: number | null
}

// Solo para dev/QA: saltea el paso de verificacion (telefono + Didit) del wizard.
// Combinar con DIDIT_BYPASS_VERIFICATION=true en el backend. Default: false.
const SKIP_DRIVER_VERIFICATION = process.env.EXPO_PUBLIC_SKIP_DRIVER_VERIFICATION === 'true'

const STEP_TITLES: Record<StepKey, { title: string; subtitle: string }> = {
  verify: { title: 'Verificación', subtitle: 'Confirmá tu teléfono e identidad antes de poder operar.' },
  mode: { title: '¿Cómo querés repartir?', subtitle: 'Podés cambiarlo o sumar el otro tipo más adelante.' },
  route: { title: 'Tu ruta', subtitle: 'Definí desde dónde, hasta dónde y qué días viajás.' },
  vehicle: { title: 'Tu vehículo', subtitle: 'Contanos con qué vas a transportar.' },
  capacity: { title: 'Capacidad y precio', subtitle: 'Cuánto podés llevar y a qué precio.' },
  passengers: { title: 'Asientos y precio', subtitle: 'Definí cuántas personas pueden viajar y el precio por asiento.' },
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
  const [departureTimeFrom, setDepartureTimeFrom] = useState('')
  const [departureTimeTo, setDepartureTimeTo] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null)
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [maxWeightKg, setMaxWeightKg] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  // Tipo de ruta de entrega: entre ciudades o local (dentro de una ciudad).
  const [routeKind, setRouteKind] = useState<RouteKind>(presetKind ?? 'INTERCITY')

  // Pasajeros: una ruta INTERCITY puede llevar personas ademas de paquetes.
  const [carriesPassengers, setCarriesPassengers] = useState(mode === 'viajes')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [vehicleSeats, setVehicleSeats] = useState(4)
  const [seatsOffered, setSeatsOffered] = useState(3)
  const [pricePerSeat, setPricePerSeat] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationSyncing, setVerificationSyncing] = useState(false)
  const [verificationNote, setVerificationNote] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  // Entrega y Viajes comparten corredor, calendario y vehiculo. Cada modo agrega
  // solo su capacidad comercial (paquetes o asientos).
  const steps = useMemo<StepKey[]>(() => {
    const entrega = (mode ?? 'entrega') === 'entrega'
    const viajes = mode === 'viajes'
    const skipVerify = isAddingRoute || SKIP_DRIVER_VERIFICATION
    // Con kind preseteado no mostramos el paso de seleccion de tipo.
    // El paso de pasajeros solo aplica a rutas entre ciudades.
    const wantsPassengerStep = (presetKind ?? routeKind) === 'INTERCITY'
    const entregaCore: StepKey[] = wantsPassengerStep
      ? ['route', 'vehicle', 'capacity', 'passengers']
      : ['route', 'vehicle', 'capacity']
    const entregaBase: StepKey[] = presetKind
      ? [...entregaCore, 'review']
      : ['mode', ...entregaCore, 'review']
    const viajesBase: StepKey[] = ['route', 'vehicle', 'passengers', 'review']
    const base: StepKey[] = entrega ? entregaBase : viajes ? viajesBase : ['basics', 'coverage', 'review']
    return skipVerify ? base : ['verify', ...base]
  }, [mode, isAddingRoute, presetKind, routeKind])

  useEffect(() => {
    if (!isAddingRoute && !mode) router.replace('/driver')
  }, [mode, isAddingRoute])

  // Recuperamos flota y ruta principal para que editar/repetir el wizard no
  // pierda datos ni cree registros duplicados.
  useEffect(() => {
    if (!token) return
    void (async () => {
      try {
        const fleet = await fetchVehicles(token)
        setVehicles(fleet)
        const routeId = currentProfile?.primaryRouteId
        if (!routeId) return
        const response = await api.get<{ routes: StoredDriverRoute[] }>('/drivers/routes/mine', token)
        const route = response.routes.find(item => item.id === routeId)
        if (!route) return
        setRouteKind(mode === 'viajes' ? 'INTERCITY' : route.kind)
        setOriginCity(route.originCity)
        setDestinationCity(route.destinationCity)
        setWaypointCities(route.waypointCities)
        setSelectedDays(route.daysOfWeek)
        setDepartureTimeFrom(route.departureTimeFrom ?? '')
        setDepartureTimeTo(route.departureTimeTo ?? '')
        setVehicleType(route.vehicleType)
        setLicensePlate(route.licensePlate ?? '')
        setVehicleModel(route.vehicleModel ?? '')
        setVehicleColor(route.vehicleColor ?? '')
        setMaxWeightKg(route.maxWeightKg > 0 ? String(route.maxWeightKg) : '')
        setPricePerKg(route.pricePerKg != null ? String(route.pricePerKg) : '')
        setSelectedVehicleId(route.vehicleId ?? null)
        setCarriesPassengers(mode === 'viajes' || route.carriesPassengers)
        setSeatsOffered(route.seatsOffered ?? 3)
        setPricePerSeat(route.pricePerSeat != null ? String(route.pricePerSeat) : '')
        const linkedVehicle = fleet.find(item => item.id === route.vehicleId)
        if (linkedVehicle) setVehicleSeats(linkedVehicle.seats)
      } catch {
        // El wizard sigue utilizable; los errores de guardado se muestran al finalizar.
      }
    })()
  }, [currentProfile?.primaryRouteId, mode, token])

  useEffect(() => {
    if (
      !isAddingRoute &&
      token &&
      user?.driverVerificationStatus &&
      user.driverVerificationStatus !== 'NOT_STARTED' &&
      user.driverVerificationStatus !== 'APPROVED'
    ) {
      void (async () => {
        try {
          const status = await syncDriverVerification(true)
          setVerificationNote(status?.notes ?? null)
        } catch {}
      })()
    }
  }, [isAddingRoute, token, syncDriverVerification, user?.driverVerificationStatus])

  if (!isAddingRoute && !mode) return null

  const effectiveMode = mode ?? 'entrega'
  const meta = getDriverModeMeta(effectiveMode)
  const isEntrega = effectiveMode === 'entrega'
  const isViajes = effectiveMode === 'viajes'
  const isStructuredRoute = isEntrega || isViajes
  const driverVerificationApproved = user?.driverVerificationStatus === 'APPROVED'
  const verificationOk = driverVerificationApproved || SKIP_DRIVER_VERIFICATION
  const hasDriverVerificationSession =
    user?.driverVerificationStatus !== undefined &&
    user.driverVerificationStatus !== 'NOT_STARTED' &&
    user.driverVerificationStatus !== 'APPROVED'

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

  function validateStructuredRoute(): string | null {
    if (!isViajes && routeKind === 'LOCAL') {
      if (!originCity.trim()) return 'Ingresá tu ciudad de operación.'
    } else {
      if (!originCity.trim()) return 'Ingresá la ciudad de origen.'
      if (!destinationCity.trim()) return 'Ingresá la ciudad de destino.'
      if (selectedDays.length === 0) return 'Seleccioná al menos un día.'
      if (departureTimeFrom && !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTimeFrom)) return 'Usá formato HH:MM para la hora de salida.'
      if (departureTimeTo && !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTimeTo)) return 'Usá formato HH:MM para el fin de la franja.'
    }
    if (!vehicleType) return 'Seleccioná el tipo de vehículo.'
    if (!licensePlate.trim()) return 'Ingresá la patente del vehículo.'
    if (isEntrega) {
      const kg = parseFloat(maxWeightKg)
      if (!maxWeightKg || !Number.isFinite(kg) || kg <= 0) return 'Ingresá el peso máximo en kg.'
    }
    if (isViajes) {
      if (seatsOffered < 1) return 'Ofrecé al menos un asiento.'
      const price = parseFloat(pricePerSeat)
      if (!pricePerSeat || !Number.isFinite(price) || price <= 0) return 'Ingresá el precio por asiento.'
    }
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

    const validationError = isStructuredRoute ? validateStructuredRoute() : validateGeneric()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      let primaryRouteId = currentProfile?.primaryRouteId ?? null
      if (isStructuredRoute && token) {
        let routeVehicleId = selectedVehicleId
        if (!routeVehicleId && (isViajes || carriesPassengers)) {
          const createdVehicle = await createVehicle(token, {
            type: vehicleType!,
            licensePlate: licensePlate.trim() || undefined,
            model: vehicleModel.trim() || undefined,
            color: vehicleColor.trim() || undefined,
            seats: vehicleSeats,
          })
          routeVehicleId = createdVehicle.id
          setSelectedVehicleId(createdVehicle.id)
          setVehicles(previous => [createdVehicle, ...previous])
        }
        const commonRoute = {
          vehicleType,
          licensePlate: licensePlate.trim() || undefined,
          vehicleModel: vehicleModel.trim() || undefined,
          vehicleColor: vehicleColor.trim() || undefined,
          maxWeightKg: isEntrega ? parseFloat(maxWeightKg) : 0,
          pricePerKg: isEntrega && pricePerKg ? parseFloat(pricePerKg) : undefined,
          carriesPackages: isEntrega,
        }
        const effectiveRouteKind = isViajes ? 'INTERCITY' : routeKind
        const routePayload = effectiveRouteKind === 'LOCAL'
          ? { kind: 'LOCAL', city: originCity.trim(), ...commonRoute }
          : {
              kind: 'INTERCITY',
              originCity: originCity.trim(),
              destinationCity: destinationCity.trim(),
              waypointCities: waypointCities.filter(c => c.trim().length > 0),
              daysOfWeek: selectedDays,
              departureTimeFrom: departureTimeFrom || undefined,
              departureTimeTo: departureTimeTo || undefined,
              ...commonRoute,
              ...((isViajes || carriesPassengers)
                ? {
                    carriesPassengers: true,
                    vehicleId: routeVehicleId ?? undefined,
                    seatsOffered,
                    pricePerSeat: parseFloat(pricePerSeat),
                  }
                : {}),
            }
        const routeResponse = primaryRouteId && !isAddingRoute
          ? await api.patch<{ route: { id: string } }>(`/drivers/routes/${primaryRouteId}`, { ...routePayload, isActive: true }, token)
          : await api.post<{ route: { id: string } }>('/drivers/routes', routePayload, token)
        primaryRouteId = routeResponse.route.id
      }

      if (!isAddingRoute && mode) {
        const isLocal = isEntrega && routeKind === 'LOCAL'
        await saveDriverProfile({
          mode,
          city: isStructuredRoute ? originCity.trim() : city.trim(),
          vehicle: isStructuredRoute ? (vehicleType ?? '') : vehicle.trim(),
          coverage: isStructuredRoute ? (isLocal ? originCity.trim() : destinationCity.trim()) : coverage.trim(),
          availability: isStructuredRoute ? (isLocal ? 'Envíos locales' : selectedDays.join(', ')) : availability.trim(),
          notes: notes.trim(),
          onboardingCompleted: true,
          onboardingVersion: 1,
          primaryRouteId,
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
  const displayStep = isAddingRoute ? step + 1 : step + 2
  const displayTotal = isAddingRoute ? steps.length : steps.length + 1
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) ?? null
  // El paso de ruta cambia de titulo segun el tipo (local vs entre ciudades).
  const heading = currentStepKey === 'route' && routeKind === 'LOCAL' && !isViajes
    ? { title: 'Tu ciudad', subtitle: '¿En qué ciudad vas a hacer repartos?' }
    : currentStepKey === 'route' && isViajes
      ? { title: 'Tu ruta de viaje', subtitle: 'Elegí ciudades de Google y definí cuándo hacés este recorrido.' }
      : currentStepKey === 'vehicle' && isViajes
        ? { title: 'Tu vehículo', subtitle: 'Elegí uno guardado o cargá el auto con el que vas a viajar.' }
        : STEP_TITLES[currentStepKey]

  // Valida solo los campos del paso actual antes de avanzar.
  function validateStep(key: StepKey): string | null {
    switch (key) {
      case 'verify':
        if (!verificationOk) return 'Completá la verificación de conductor con Didit antes de continuar.'
        return null
      case 'route':
        if (!isViajes && routeKind === 'LOCAL') {
          if (!originCity.trim()) return 'Ingresá tu ciudad de operación.'
          return null
        }
        if (!originCity.trim()) return 'Ingresá la ciudad de origen.'
        if (!destinationCity.trim()) return 'Ingresá la ciudad de destino.'
        if (selectedDays.length === 0) return 'Seleccioná al menos un día.'
        if (departureTimeFrom && !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTimeFrom)) return 'Usá formato HH:MM para la hora de salida.'
        if (departureTimeTo && !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTimeTo)) return 'Usá formato HH:MM para el fin de la franja.'
        return null
      case 'vehicle':
        if (!vehicleType) return 'Seleccioná el tipo de vehículo.'
        if (!licensePlate.trim()) return 'Ingresá la patente del vehículo.'
        if (isViajes && vehicleSeats < 1) return 'Indicá al menos un asiento disponible.'
        return null
      case 'capacity': {
        const kg = parseFloat(maxWeightKg)
        if (!maxWeightKg || !Number.isFinite(kg) || kg <= 0) return 'Ingresá el peso máximo en kg.'
        return null
      }
      case 'passengers':
        if (isViajes || carriesPassengers) {
          if (seatsOffered < 1) return 'Ofrecé al menos un asiento.'
          if (seatsOffered > (selectedVehicle?.seats ?? vehicleSeats)) return 'No podés ofrecer más asientos que los disponibles en el vehículo.'
          const price = parseFloat(pricePerSeat)
          if (!pricePerSeat || !Number.isFinite(price) || price <= 0) return 'Ingresá el precio por asiento.'
        }
        return null
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
        <View style={styles.progressHeader}>
          <Text style={styles.step}>Paso {displayStep} de {displayTotal}</Text>
          <View style={styles.progressRow}>
            {Array.from({ length: displayTotal }, (_, idx) => (
              <View
                key={idx}
                style={[styles.progressSegment, idx < displayStep && styles.progressSegmentActive]}
              />
            ))}
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name={meta.icon} size={16} color="#77B6FF" />
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
          {(currentStepKey === 'mode' || currentStepKey === 'capacity') ? (
            <View style={styles.heroIllustration}>
              <View style={styles.speedLines}>
                <View style={styles.speedLineLong} />
                <View style={styles.speedLineShort} />
              </View>
              <Text style={styles.heroEmoji}>📦</Text>
            </View>
          ) : null}
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
                <Ionicons name="business" size={22} color="#77B6FF" />
              </View>
              <View style={styles.modeBody}>
                <Text style={styles.modeTitle}>Dentro de mi ciudad</Text>
                <Text style={styles.modeDesc}>Repartos locales. Te ponés online y recibís envíos al instante.</Text>
              </View>
              {routeKind === 'LOCAL'
                ? <Ionicons name="checkmark-circle" size={22} color="#6CE7F4" />
                : <View style={styles.modeRadio} />}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.modeCard, routeKind === 'INTERCITY' && styles.modeCardActive]}
              onPress={() => setRouteKind('INTERCITY')}
            >
              <View style={styles.modeIcon}>
                <Ionicons name="navigate" size={22} color="#77B6FF" />
              </View>
              <View style={styles.modeBody}>
                <Text style={styles.modeTitle}>Entre ciudades</Text>
                <Text style={styles.modeDesc}>Rutas programadas A → B en los días que viajás.</Text>
              </View>
              {routeKind === 'INTERCITY'
                ? <Ionicons name="checkmark-circle" size={22} color="#6CE7F4" />
                : <View style={styles.modeRadio} />}
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="information" size={16} color="#071422" />
              </View>
              <Text style={styles.infoText}>{'Después podés sumar el otro tipo desde “Mis rutas”.'}</Text>
            </View>
          </View>
        ) : null}

        {currentStepKey === 'route' && routeKind === 'LOCAL' && !isViajes ? (
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
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Input
                  label="Hora de salida (opcional)"
                  value={departureTimeFrom}
                  onChangeText={setDepartureTimeFrom}
                  placeholder="08:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={styles.timeField}>
                <Input
                  label="Hasta (opcional)"
                  value={departureTimeTo}
                  onChangeText={setDepartureTimeTo}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        ) : null}

        {currentStepKey === 'vehicle' ? (
          <View style={styles.form}>
            {vehicles.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Vehículos guardados</Text>
                {vehicles.map(savedVehicle => {
                  const active = selectedVehicleId === savedVehicle.id
                  return (
                    <TouchableOpacity
                      key={savedVehicle.id}
                      activeOpacity={0.85}
                      style={[styles.savedVehicleCard, active && styles.modeCardActive]}
                      onPress={() => {
                        setSelectedVehicleId(savedVehicle.id)
                        setVehicleType(savedVehicle.type)
                        setLicensePlate(savedVehicle.licensePlate ?? '')
                        setVehicleModel(savedVehicle.model ?? '')
                        setVehicleColor(savedVehicle.color ?? '')
                        setVehicleSeats(savedVehicle.seats)
                        setSeatsOffered(previous => Math.min(previous, savedVehicle.seats))
                      }}
                    >
                      <Ionicons name={savedVehicle.type === 'MOTO' ? 'bicycle' : 'car-sport'} size={21} color="#77B6FF" />
                      <View style={styles.modeBody}>
                        <Text style={styles.modeTitle}>{VEHICLE_TYPE_LABELS[savedVehicle.type]}{savedVehicle.model ? ` · ${savedVehicle.model}` : ''}</Text>
                        <Text style={styles.modeDesc}>{savedVehicle.licensePlate ?? 'Sin patente'} · {savedVehicle.seats} asientos</Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={22} color="#6CE7F4" /> : <View style={styles.modeRadio} />}
                    </TouchableOpacity>
                  )
                })}
                <TouchableOpacity style={styles.newVehicleLink} onPress={() => setSelectedVehicleId(null)}>
                  <Ionicons name="add-circle-outline" size={17} color={Theme.colors.lime} />
                  <Text style={styles.addWaypointText}>Cargar otro vehículo</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <Text style={styles.fieldLabel}>Tipo de vehículo *</Text>
            <View style={styles.vehicleGrid}>
              {VEHICLE_OPTIONS.map(v => {
                const active = vehicleType === v.key
                return (
                  <TouchableOpacity
                    key={v.key}
                    activeOpacity={0.8}
                    style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                    onPress={() => {
                      setSelectedVehicleId(null)
                      setVehicleType(v.key)
                    }}
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
              onChangeText={value => {
                setSelectedVehicleId(null)
                setLicensePlate(value)
              }}
              placeholder="ABC 123"
              autoCapitalize="characters"
            />
            <Input
              label="Modelo del vehículo (opcional)"
              value={vehicleModel}
              onChangeText={value => {
                setSelectedVehicleId(null)
                setVehicleModel(value)
              }}
              placeholder="Renault Logan"
              autoCapitalize="words"
            />
            <Input
              label="Color del vehículo (opcional)"
              value={vehicleColor}
              onChangeText={value => {
                setSelectedVehicleId(null)
                setVehicleColor(value)
              }}
              placeholder="Blanco"
              autoCapitalize="words"
            />
            {isViajes ? (
              <>
                <Text style={styles.fieldLabel}>Asientos disponibles para pasajeros</Text>
                <View style={styles.seatStepper}>
                  <TouchableOpacity style={styles.seatStepBtn} onPress={() => {
                    setSelectedVehicleId(null)
                    setVehicleSeats(value => Math.max(1, value - 1))
                    setSeatsOffered(value => Math.min(value, Math.max(1, vehicleSeats - 1)))
                  }}>
                    <Ionicons name="remove" size={20} color={Theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.seatStepValue}>{vehicleSeats}</Text>
                  <TouchableOpacity style={styles.seatStepBtn} onPress={() => {
                    setSelectedVehicleId(null)
                    setVehicleSeats(value => Math.min(20, value + 1))
                  }}>
                    <Ionicons name="add" size={20} color={Theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {currentStepKey === 'capacity' ? (
          <View style={styles.form}>
            <View style={styles.capacityCard}>
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
            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons name="bulb" size={18} color="#FFD66B" />
              </View>
              <Text style={styles.tipText}>Estos datos nos ayudan a mostrarte pedidos que se ajusten a tu capacidad.</Text>
            </View>
          </View>
        ) : null}

        {currentStepKey === 'passengers' ? (
          <View style={styles.form}>
            {!isViajes ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.modeCard, carriesPassengers && styles.modeCardActive]}
                onPress={() => setCarriesPassengers(value => !value)}
              >
                <View style={styles.modeIcon}>
                  <Ionicons name="people" size={22} color="#77B6FF" />
                </View>
                <View style={styles.modeBody}>
                  <Text style={styles.modeTitle}>Llevar personas también</Text>
                  <Text style={styles.modeDesc}>En esta misma ruta podés sumar pasajeros además de paquetes.</Text>
                </View>
                {carriesPassengers
                  ? <Ionicons name="checkmark-circle" size={22} color="#6CE7F4" />
                  : <View style={styles.modeRadio} />}
              </TouchableOpacity>
            ) : (
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}><Ionicons name="people" size={15} color="#071422" /></View>
                <Text style={styles.infoText}>Los pasajeros verán esta ruta en los días elegidos y podrán solicitar un asiento.</Text>
              </View>
            )}

            {!isViajes && !carriesPassengers ? (
              <Text style={styles.modeHint}>Si lo activás, los usuarios van a poder pedir sumarse a tu viaje ese día.</Text>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Asientos que ofrecés</Text>
                <View style={styles.seatStepper}>
                  <TouchableOpacity style={styles.seatStepBtn} activeOpacity={0.8} onPress={() => setSeatsOffered(seat => Math.max(1, seat - 1))}>
                    <Ionicons name="remove" size={20} color={Theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.seatStepValue}>{seatsOffered}</Text>
                  <TouchableOpacity
                    style={styles.seatStepBtn}
                    activeOpacity={0.8}
                    onPress={() => setSeatsOffered(seat => Math.min(selectedVehicle?.seats ?? vehicleSeats, seat + 1))}
                  >
                    <Ionicons name="add" size={20} color={Theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.seatStepHint}>de {selectedVehicle?.seats ?? vehicleSeats} disponibles</Text>
                </View>

                <Input
                  label="Precio por asiento *"
                  value={pricePerSeat}
                  onChangeText={setPricePerSeat}
                  placeholder="3500"
                  keyboardType="decimal-pad"
                />
              </>
            )}
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
                  {carriesPassengers ? (
                    <SummaryRow label="Pasajeros" value={`${seatsOffered} asiento(s) · $${pricePerSeat || '—'}/asiento`} />
                  ) : null}
                </>
              ) : isViajes ? (
                <>
                  <SummaryRow label="Ruta" value={`${originCity || '—'} → ${destinationCity || '—'}`} />
                  {waypointCities.filter(cityName => cityName.trim()).length > 0 ? (
                    <SummaryRow label="Paradas" value={waypointCities.filter(cityName => cityName.trim()).join(', ')} />
                  ) : null}
                  <SummaryRow label="Días" value={selectedDays.length ? selectedDays.join(', ') : '—'} />
                  {departureTimeFrom ? <SummaryRow label="Salida" value={departureTimeTo ? `${departureTimeFrom}–${departureTimeTo}` : departureTimeFrom} /> : null}
                  <SummaryRow label="Vehículo" value={`${vehicleType ?? '—'}${vehicleModel ? ` · ${vehicleModel}` : ''}`} />
                  <SummaryRow label="Patente" value={licensePlate || '—'} />
                  <SummaryRow label="Asientos" value={String(seatsOffered)} />
                  <SummaryRow label="Precio por asiento" value={pricePerSeat ? `$${pricePerSeat}` : '—'} />
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

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071422' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  progressHeader: { flex: 1, alignItems: 'center', gap: 9 },
  headerSpacer: { width: 44 },
  step: {
    color: '#6AA4FF',
    fontFamily: Theme.fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 28 },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    width: 26,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#213A5B',
  },
  progressSegmentActive: {
    backgroundColor: '#65D5FF',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E3852',
    backgroundColor: '#071422',
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
    minHeight: 90,
    borderRadius: 17,
    backgroundColor: '#10243A',
    borderWidth: 1,
    borderColor: '#284664',
    marginBottom: 10,
  },
  modeCardActive: {
    borderColor: '#5597FF',
    backgroundColor: '#142D4A',
    borderWidth: 2,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102C48',
    borderWidth: 1,
    borderColor: '#234A70',
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
  infoCard: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#10243A',
    borderWidth: 1,
    borderColor: '#284664',
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#789FD4',
  },
  infoText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 11, lineHeight: 16 },
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
    position: 'relative',
    minHeight: 145,
    paddingHorizontal: 4,
    paddingTop: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#173254',
    borderWidth: 1,
    borderColor: '#294E77',
  },
  badgeText: { color: '#DCEAFF', fontFamily: Theme.fonts.bold, fontSize: 12 },
  title: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
    maxWidth: '76%',
    fontSize: 28,
    lineHeight: 31,
    marginTop: 17,
  },
  description: {
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: '82%',
    marginTop: 8,
  },
  heroIllustration: {
    position: 'absolute',
    right: 2,
    top: 22,
    width: 104,
    height: 82,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 55, lineHeight: 65 },
  speedLines: { position: 'absolute', left: 0, top: 29, gap: 8 },
  speedLineLong: { width: 29, height: 4, borderRadius: 3, backgroundColor: '#4C8BDC', transform: [{ rotate: '-18deg' }] },
  speedLineShort: { width: 20, height: 4, borderRadius: 3, backgroundColor: '#4C8BDC', transform: [{ rotate: '-18deg' }] },
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
  form: { marginTop: 12 },
  capacityCard: {
    padding: 14,
    paddingBottom: 0,
    borderRadius: 18,
    backgroundColor: '#10243A',
    borderWidth: 1,
    borderColor: '#284664',
  },
  tipCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#10243A',
    borderWidth: 1,
    borderColor: '#284664',
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 214, 107, 0.10)',
  },
  tipText: { flex: 1, color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, lineHeight: 17 },
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
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
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
  savedVehicleCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#10243A',
    borderWidth: 1,
    borderColor: '#284664',
    marginBottom: 8,
  },
  newVehicleLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, marginBottom: 8 },
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
  seatStepper: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  seatStepBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
  },
  seatStepValue: { color: Theme.colors.text, fontFamily: Theme.fonts.bold, fontSize: 20, minWidth: 28, textAlign: 'center' },
  seatStepHint: { color: Theme.colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },
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
}))
