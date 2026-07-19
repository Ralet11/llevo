import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenSafeArea } from '../../components/app/ScreenSafeArea'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { CityPicker } from '../../components/ui/CityPicker'
import { IconButton } from '../../components/ui/IconButton'
import { Theme } from '../../constants/theme'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { createBooking, searchTrips, type TripOption, type TripSearchResult } from '../../lib/trips'

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
  const { palette } = useTheme()
  const colors = palette.colors
  const s = createStyles(colors)

  const [originCity, setOriginCity] = useState('')
  const [destinationCity, setDestinationCity] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TripSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [swapKey, setSwapKey] = useState(0)

  const canSearch = originCity.trim().length > 0 && destinationCity.trim().length > 0

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
    try {
      const dateISO = new Date(
        selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0,
      ).toISOString()
      const data = await searchTrips(token, { originCity: originCity.trim(), destinationCity: destinationCity.trim(), dateISO })
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

  const dateLabel = sameDay(selectedDate, startOfDay(new Date()))
    ? 'Hoy'
    : sameDay(selectedDate, new Date(Date.now() + 86400000))
      ? 'Mañana'
      : selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

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

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        ) : result ? (
          result.sameCity ? (
            <View style={s.info}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              <Text style={s.infoText}>Por ahora los viajes son entre ciudades distintas. Muy pronto sumamos viajes dentro de la misma ciudad.</Text>
            </View>
          ) : result.options.length === 0 ? (
            <View style={s.info}>
              <Ionicons name="car-outline" size={20} color={colors.textMuted} />
              <Text style={s.infoText}>No hay socios con lugar en ese recorrido ese día. Probá otra fecha.</Text>
            </View>
          ) : (
            <View style={s.results}>
              <Text style={s.resultsTitle}>{result.options.length} viaje{result.options.length > 1 ? 's' : ''} disponible{result.options.length > 1 ? 's' : ''}</Text>
              {result.options.map(o => (
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 16 },

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
