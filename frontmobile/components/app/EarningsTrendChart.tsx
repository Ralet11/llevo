import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

export type DailyEarning = { date: string; amount: number }

const MAX_BAR_HEIGHT = 96
const MIN_BAR_HEIGHT = 3
const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function parseDayKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function money(amount: number, currency: string) {
  return `$${amount.toLocaleString('es-AR')}${currency === 'ARS' ? '' : ` ${currency}`}`
}

export function EarningsTrendChart({ data, currency }: { data: DailyEarning[]; currency: string }) {
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1)
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)

  if (data.length === 0) return null

  const max = Math.max(...data.map(d => d.amount), 1)
  const selected = data[selectedIndex] ?? data[data.length - 1]
  const selectedDate = parseDayKey(selected.date)
  const isToday = selectedIndex === data.length - 1
  const selectedLabel = isToday
    ? 'Hoy'
    : selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Últimos 7 días</Text>
        <Text style={styles.caption}>
          <Text style={styles.captionStrong}>{selectedLabel}</Text> · {money(selected.amount, currency)}
        </Text>
      </View>

      <View style={styles.chartRow}>
        {data.map((d, i) => {
          const isSelected = i === selectedIndex
          const barHeight = Math.max(MIN_BAR_HEIGHT, (d.amount / max) * MAX_BAR_HEIGHT)
          return (
            <TouchableOpacity
              key={d.date}
              style={styles.barCol}
              activeOpacity={0.7}
              onPress={() => setSelectedIndex(i)}
            >
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight },
                    isSelected && styles.barSelected,
                  ]}
                />
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.baseline} />

      <View style={styles.labelsRow}>
        {data.map((d, i) => {
          const isSelected = i === selectedIndex
          const isLast = i === data.length - 1
          const weekday = WEEKDAY_LETTERS[parseDayKey(d.date).getDay()]
          return (
            <Text key={d.date} style={[styles.weekdayLabel, (isSelected || isLast) && styles.weekdayLabelStrong]}>
              {weekday}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  card: {
    padding: 18, borderRadius: 20, gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  headRow: { gap: 2 },
  title: {
    color: colors.textSubtle, fontFamily: Theme.fonts.bold,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  caption: { color: colors.textMuted, fontFamily: Theme.fonts.medium, fontSize: 13, textTransform: 'capitalize' },
  captionStrong: { color: colors.text, fontFamily: Theme.fonts.bold },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { height: MAX_BAR_HEIGHT, justifyContent: 'flex-end' },
  bar: {
    width: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4,
    backgroundColor: colors.limeSoft,
    opacity: 0.55,
  },
  barSelected: { backgroundColor: colors.lime, opacity: 1 },
  baseline: { height: 1, backgroundColor: colors.border },
  labelsRow: { flexDirection: 'row', marginTop: 8 },
  weekdayLabel: {
    flex: 1, textAlign: 'center',
    color: colors.textSubtle, fontFamily: Theme.fonts.semiBold, fontSize: 11,
  },
  weekdayLabelStrong: { color: colors.lime },
})
