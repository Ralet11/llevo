import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { CityPicker } from '../../components/ui/CityPicker'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { ApiError } from '../../lib/api'
import { createBooking, createRouteAlert, searchTrips, type TravelRequest, type TripOption, type TripSearchResult } from '../../lib/trips'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('')
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateFromRouteParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value
  const match = raw ? /^(\d{4})-(\d{2})-(\d{2})/.exec(raw) : null
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : startOfDay(new Date())
}

// ─── Calendario del mes (selección de fecha del viaje) ────────────────────────

function MonthCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const { palette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  const year = month.getFullYear()
  const mi = month.getMonth()
  const firstOfMonth = new Date(year, mi, 1)
  const daysInMonth = new Date(year, mi + 1, 0).getDate()
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7 // semana empieza lunes

  const cells: (Date | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mi, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const canPrev = year > today.getFullYear() || (year === today.getFullYear() && mi > today.getMonth())

  return (
    <View style={s.calCard}>
      <View style={s.calHeader}>
        <TouchableOpacity
          style={[s.calArrow, !canPrev && s.calArrowDisabled]}
          activeOpacity={0.7}
          disabled={!canPrev}
          onPress={() => setMonth(new Date(year, mi - 1, 1))}
        >
          <Ionicons name="chevron-back" size={18} color={canPrev ? colors.text : colors.textSubtle} />
        </TouchableOpacity>
        <Text style={s.calTitle}>{MONTHS[mi]} {year}</Text>
        <TouchableOpacity style={s.calArrow} activeOpacity={0.7} onPress={() => setMonth(new Date(year, mi + 1, 1))}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={s.calWeekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <View key={i} style={s.calCell}>
            <Text style={[s.calWeekText, i >= 5 && s.calWeekend]}>{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={s.calWeekRow}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={s.calCell} />
            const isPast = date < today
            const isToday = sameDay(date, today)
            const isSelected = sameDay(date, selected)
            const isWeekend = di >= 5
            return (
              <TouchableOpacity
                key={di}
                style={s.calCell}
                activeOpacity={0.7}
                disabled={isPast}
                onPress={() => onSelect(date)}
              >
                <View style={[s.calDay, isToday && s.calDayToday, isSelected && s.calDaySelected]}>
                  <Text style={[
                    s.calDayText,
                    isWeekend && s.calDayWeekend,
                    isPast && s.calDayPast,
                    isSelected && s.calDayTextSelected,
                  ]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function TravelScreen() {
  const { token } = useAuth()
  const routeParams = useLocalSearchParams<{ origin?: string; destination?: string; date?: string }>()
  const { palette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)

  const [originCity, setOriginCity] = useState(() => routeParams.origin ?? '')
  const [destinationCity, setDestinationCity] = useState(() => routeParams.destination ?? '')
  const [selectedDate, setSelectedDate] = useState<Date>(() => dateFromRouteParam(routeParams.date))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TripSearchResult | null>(null)
  const [formResult] = useState<TripSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [alertBusy, setAlertBusy] = useState(false)
  const [alertCreated, setAlertCreated] = useState(false)
  const [swapKey, setSwapKey] = useState(0)
  const [travelRequest] = useState<TravelRequest | null>(null)

  const canSearch = originCity.trim().length > 0 && destinationCity.trim().length > 0

  useEffect(() => {
    if (routeParams.origin) setOriginCity(routeParams.origin)
    if (routeParams.destination) setDestinationCity(routeParams.destination)
    if (routeParams.date) setSelectedDate(dateFromRouteParam(routeParams.date))
  }, [routeParams.origin, routeParams.destination, routeParams.date])

  function swapCities() {
    setOriginCity(destinationCity)
    setDestinationCity(originCity)
    setSwapKey(k => k + 1)
  }

  async function handleSearch() {
    if (!token || !canSearch) return
    setError(null)
    setLoading(true)
    setResult(null)
    setAlertCreated(false)
    try {
      const dateISO = new Date(
        selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0,
      ).toISOString()
      const data = await searchTrips(token, {
        originCity: originCity.trim(),
        destinationCity: destinationCity.trim(),
        dateISO,
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestSeat(option: TripOption) {
    if (!token) return
    setRequestingId(option.routeId)
    try {
      const dateISO = new Date(
        selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0,
      ).toISOString()
      await createBooking(token, {
        routeId: option.routeId,
        dateISO,
        seats: 1,
        originCity: originCity.trim(),
        destinationCity: destinationCity.trim(),
      })
      Alert.alert('¡Solicitud enviada!', 'El conductor va a revisar tu pedido. Te avisamos cuando responda.', [
        { text: 'Ver mis viajes', onPress: () => router.push('/(app)/my-trips') },
        { text: 'Seguir buscando', style: 'cancel' },
      ])
    } catch (err) {
      Alert.alert('No se pudo solicitar', err instanceof Error ? err.message : 'Intentá de nuevo.')
    } finally {
      setRequestingId(null)
    }
  }

  async function handleCreateRouteAlert() {
    if (!token) return
    setAlertBusy(true)
    try {
      const dateISO = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0).toISOString()
      await createRouteAlert(token, { originCity: originCity.trim(), destinationCity: destinationCity.trim(), dateISO })
      setAlertCreated(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Actualización pendiente', 'La versión pública del servidor todavía no tiene activadas las alertas de ruta. Actualizá el backend y volvé a intentarlo.')
      } else {
        Alert.alert('No se pudo activar el aviso', err instanceof Error ? err.message : 'Intentá de nuevo.')
      }
    } finally {
      setAlertBusy(false)
    }
  }

  const dateLabel = sameDay(selectedDate, startOfDay(new Date()))
    ? 'Hoy'
    : sameDay(selectedDate, new Date(Date.now() + 86400000))
      ? 'Mañana'
      : selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  // El formulario inicial entra completo en pantalla; los resultados y errores
  // sí pueden sumar contenido y necesitan desplazamiento.
  const hasScrollableContent = result !== null || error !== null

  if (result) {
    const noOptions = result.sameCity || result.options.length === 0
    return (
      <ScreenSafeArea style={s.container}>
        <View style={s.header}>
          <IconButton name="chevron-back" onPress={() => setResult(null)} />
          <View style={s.headerCopy}>
            <Text style={s.headerLabel}>Modo usuario</Text>
            <Text style={s.headerTitle}>Viajes disponibles</Text>
          </View>
          <TouchableOpacity style={s.myTripsBtn} activeOpacity={0.8} onPress={() => router.push('/(app)/my-trips')}>
            <Text style={s.myTripsBtnText}>Mis viajes</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.resultsScreen} showsVerticalScrollIndicator={false}>
          <View style={s.resultSearchSummary}>
            <Text style={s.resultSearchRoute}>{originCity} → {destinationCity}</Text>
            <Text style={s.resultSearchDate}>{dateLabel}</Text>
          </View>
          {noOptions ? (
            <View style={s.emptyResult}>
              <View style={s.emptyResultIcon}><Ionicons name="car-outline" size={30} color={colors.lime} /></View>
              <Text style={s.emptyResultTitle}>{result.sameCity ? 'Elegí dos ciudades distintas' : 'No hay viajes disponibles'}</Text>
              <Text style={s.emptyResultText}>{result.sameCity ? 'Por ahora podés buscar viajes entre ciudades distintas.' : 'No encontramos viajes que cubran esta ruta en esa fecha. Probá con otro día o un tramo de la misma ruta.'}</Text>
              {!result.sameCity ? (
                alertCreated ? (
                  <View style={s.alertEnabled}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={s.alertEnabledText}>Te vamos a avisar si se publica un viaje para esta ruta.</Text></View>
                ) : (
                  <Button label="Avisarme si se publica un viaje" onPress={() => void handleCreateRouteAlert()} loading={alertBusy} style={s.emptyResultButton} />
                )
              ) : null}
              <TouchableOpacity style={s.editSearchLink} onPress={() => setResult(null)}><Text style={s.editSearchLinkText}>Modificar búsqueda</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={s.results}>
              <Text style={s.resultsTitle}>{result.options.length} viaje{result.options.length > 1 ? 's' : ''} disponible{result.options.length > 1 ? 's' : ''}</Text>
              {result.options.map(o => (
                <TripCard key={o.routeId} option={o} requesting={requestingId === o.routeId} onRequest={() => void handleRequestSeat(o)} />
              ))}
              <TouchableOpacity style={s.editSearchLink} onPress={() => setResult(null)}><Text style={s.editSearchLinkText}>Modificar búsqueda</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </ScreenSafeArea>
    )
  }

  if (travelRequest) {
    return (
      <ScreenSafeArea style={s.container}>
        <View style={s.header}>
          <IconButton name="chevron-back" onPress={() => router.back()} />
          <View style={s.headerCopy}>
            <Text style={s.headerLabel}>Modo usuario</Text>
            <Text style={s.headerTitle}>Quiero viajar</Text>
          </View>
        </View>
        <View style={s.searchingState}>
          <View style={s.searchingIcon}><Ionicons name="search" size={34} color={colors.lime} /></View>
          <Text style={s.searchingTitle}>Estamos buscando un viaje para vos</Text>
          <Text style={s.searchingText}>{travelRequest.originCity} → {travelRequest.destinationCity}</Text>
          <Text style={s.searchingDate}>{new Date(`${travelRequest.date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text style={s.searchingHint}>Avisamos a conductores que recorren este trayecto. Te notificamos apenas haya novedades.</Text>
          <Button label="Ver mis viajes" onPress={() => router.replace('/(app)/my-trips')} style={s.searchingBtn} />
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.replace('/(app)')}>
            <Text style={s.searchingHome}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    )
  }

  return (
    <ScreenSafeArea style={s.container}>
      <View style={s.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View style={s.headerCopy}>
          <Text style={s.headerLabel}>Modo usuario</Text>
          <Text style={s.headerTitle}>Quiero viajar</Text>
        </View>
        <TouchableOpacity style={s.myTripsBtn} activeOpacity={0.8} onPress={() => router.push('/(app)/my-trips')}>
          <Ionicons name="receipt-outline" size={16} color={colors.lime} />
          <Text style={s.myTripsBtnText}>Mis viajes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={hasScrollableContent}
      >
        {/* Origen → destino */}
        <View style={s.fieldsRow}>
          <View style={s.fieldsCol}>
            <CityPicker key={`o-${swapKey}`} icon="radio-button-on" value={originCity} onChangeCity={setOriginCity} placeholder="Ciudad de origen" />
            <CityPicker key={`d-${swapKey}`} icon="location" value={destinationCity} onChangeCity={setDestinationCity} placeholder="Ciudad de destino" />
          </View>
          <TouchableOpacity style={s.swapBtn} activeOpacity={0.8} onPress={swapCities}>
            <Ionicons name="swap-vertical" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Cuándo */}
        <View style={s.whenHeader}>
          <Text style={s.sectionLabel}>¿Cuándo viajás?</Text>
          <View style={s.datePill}>
            <Ionicons name="calendar" size={13} color={colors.black} />
            <Text style={s.datePillText}>{dateLabel}</Text>
          </View>
        </View>
        <MonthCalendar selected={selectedDate} onSelect={setSelectedDate} />

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={15} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button label="Buscar viajes" onPress={() => void handleSearch()} loading={loading} disabled={!canSearch} style={s.searchBtn} />

        {/* Resultados */}
        {loading ? (
          <View style={s.centerState}><ActivityIndicator color={colors.lime} /></View>
        ) : formResult ? (
          formResult.sameCity ? (
            <View style={s.info}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              <Text style={s.infoText}>Por ahora los viajes son entre ciudades distintas. Muy pronto sumamos viajes dentro de la misma ciudad.</Text>
            </View>
          ) : formResult.options.length === 0 ? (
            <View style={s.info}>
              <Ionicons name="car-outline" size={20} color={colors.textMuted} />
              <Text style={s.infoText}>No hay socios con lugar en ese recorrido ese día. Probá otra fecha.</Text>
            </View>
          ) : (
            <View style={s.results}>
              <Text style={s.resultsTitle}>{formResult.options.length} viaje{formResult.options.length > 1 ? 's' : ''} disponible{formResult.options.length > 1 ? 's' : ''}</Text>
              {formResult.options.map(o => (
                <TripCard key={o.routeId} option={o} requesting={requestingId === o.routeId} onRequest={() => void handleRequestSeat(o)} />
              ))}
            </View>
          )
        ) : null}
      </ScrollView>
    </ScreenSafeArea>
  )
}

function TripCard({ option, requesting, onRequest }: { option: TripOption; requesting: boolean; onRequest: () => void }) {
  const { palette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)
  const time = option.departureTimeFrom
    ? `${option.departureTimeFrom}${option.departureTimeTo ? ` – ${option.departureTimeTo}` : ''}`
    : 'Horario flexible'
  const stops = option.waypointCities.length > 0 ? option.waypointCities.join(', ') : null

  return (
    <View style={s.tripCard}>
      <View style={s.tripTop}>
        <View style={s.timeBadge}>
          <Ionicons name="time-outline" size={13} color={colors.black} />
          <Text style={s.timeBadgeText}>{time}</Text>
        </View>
        {option.pricePerSeat != null ? (
          <Text style={s.price}>${option.pricePerSeat.toLocaleString('es-AR')}<Text style={s.priceUnit}> /asiento</Text></Text>
        ) : null}
      </View>

      <Text style={s.tripRoute}>{option.originCity} → {option.destinationCity}</Text>
      {stops ? <Text style={s.tripStops}>vía {stops}</Text> : null}

      <TouchableOpacity
        style={s.driverRow}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: option.driver.id } })}
      >
        <Avatar initials={initialsOf(option.driver.name)} size={38} />
        <View style={s.driverCopy}>
          <View style={s.driverNameRow}>
            <Text style={s.driverName}>{option.driver.name}</Text>
            {option.driver.isDemo ? <Text style={s.demoBadge}>Prueba</Text> : null}
            {option.driver.isIdentityVerified ? (
              <Ionicons name="shield-checkmark" size={13} color={colors.lime} />
            ) : null}
          </View>
          <Text style={s.driverMeta}>
            {option.driver.ratingCount > 0 ? `★ ${option.driver.rating.toFixed(1)} · ${option.driver.ratingCount} reseñas` : 'Nuevo en LLEVO'}
            {option.vehicle?.model ? ` · ${option.vehicle.model}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={s.tripBottom}>
        <View style={s.seatsChip}>
          <Ionicons name="people" size={13} color={colors.lime} />
          <Text style={s.seatsChipText}>{option.seatsFree} {option.seatsFree === 1 ? 'lugar' : 'lugares'} libre{option.seatsFree === 1 ? '' : 's'}</Text>
        </View>
        <TouchableOpacity style={[s.requestBtn, requesting && s.requestBtnDisabled]} activeOpacity={0.85} onPress={onRequest} disabled={requesting}>
          {requesting
            ? <ActivityIndicator size="small" color={colors.black} />
            : <Text style={s.requestBtnText}>Solicitar sumarme</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  headerCopy: { flex: 1 },
  headerLabel: { color: colors.lime, fontFamily: Theme.fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16, marginTop: 2 },
  myTripsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  myTripsBtnText: { color: colors.lime, fontFamily: Theme.fonts.semiBold, fontSize: 12 },
  demoBadge: { color: colors.black, backgroundColor: colors.lime, borderRadius: 6, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2, fontFamily: Theme.fonts.bold, fontSize: 9 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 12 },
  resultsScreen: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 16 },
  resultSearchSummary: { padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  resultSearchRoute: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 21 },
  resultSearchDate: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, textTransform: 'capitalize', marginTop: 5 },
  emptyResult: { flex: 1, minHeight: 330, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, gap: 10 },
  emptyResultIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, marginBottom: 5 },
  emptyResultTitle: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 23, textAlign: 'center' },
  emptyResultText: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyResultButton: { alignSelf: 'stretch', marginTop: 10 },
  alertEnabled: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, marginTop: 10, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.success },
  alertEnabledText: { flex: 1, color: colors.success, fontFamily: Theme.fonts.semiBold, fontSize: 13, lineHeight: 18 },
  editSearchLink: { alignSelf: 'center', paddingVertical: 12 },
  editSearchLinkText: { color: colors.lime, fontFamily: Theme.fonts.semiBold, fontSize: 14 },

  fieldsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldsCol: { flex: 1 },
  swapBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },

  whenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, backgroundColor: colors.lime },
  datePillText: { color: colors.black, fontFamily: Theme.fonts.bold, fontSize: 12, textTransform: 'capitalize' },

  // Calendario
  calCard: { padding: 14, borderRadius: 20, gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  calArrow: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  calArrowDisabled: { opacity: 0.4 },
  calTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 15, textTransform: 'capitalize' },
  calWeekRow: { flexDirection: 'row' },
  calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  calWeekText: { color: colors.textSubtle, fontFamily: Theme.fonts.bold, fontSize: 11 },
  calWeekend: { color: colors.lime },
  calDay: { width: '100%', height: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  calDayToday: { borderWidth: 1.5, borderColor: colors.lime },
  calDaySelected: { backgroundColor: colors.lime, borderWidth: 0 },
  calDayText: { color: colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 14 },
  calDayWeekend: { color: colors.limeSoft },
  calDayPast: { color: colors.textSubtle, opacity: 0.4 },
  calDayTextSelected: { color: colors.black, fontFamily: Theme.fonts.bold },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.dangerSurface },
  errorText: { flex: 1, color: colors.text, fontFamily: Theme.fonts.medium, fontSize: 12 },
  searchBtn: { marginTop: 2 },

  searchingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  searchingIcon: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  searchingTitle: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 25, lineHeight: 31, textAlign: 'center' },
  searchingText: { color: colors.lime, fontFamily: Theme.fonts.bold, fontSize: 16, textAlign: 'center' },
  searchingDate: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 14, textTransform: 'capitalize', textAlign: 'center' },
  searchingHint: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  searchingBtn: { marginTop: 14 },
  searchingHome: { color: colors.lime, fontFamily: Theme.fonts.semiBold, fontSize: 14, paddingVertical: 8 },

  centerState: { minHeight: 100, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  infoText: { flex: 1, color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, lineHeight: 19 },

  results: { gap: 12 },
  resultsTitle: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 16 },

  tripCard: { padding: 18, borderRadius: 20, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.lime },
  timeBadgeText: { color: colors.black, fontFamily: Theme.fonts.bold, fontSize: 13 },
  price: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 18 },
  priceUnit: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12 },
  tripRoute: { color: colors.text, fontFamily: Theme.fonts.display, fontSize: 22, lineHeight: 26 },
  tripStops: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, marginTop: -6 },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  driverCopy: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { color: colors.text, fontFamily: Theme.fonts.bold, fontSize: 14 },
  driverMeta: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 12, marginTop: 2 },

  tripBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seatsChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.backgroundDeep },
  seatsChipText: { color: colors.text, fontFamily: Theme.fonts.semiBold, fontSize: 12 },
  requestBtn: { minWidth: 150, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.lime },
  requestBtnDisabled: { opacity: 0.6 },
  requestBtnText: { color: colors.black, fontFamily: Theme.fonts.bold, fontSize: 14 },
})
