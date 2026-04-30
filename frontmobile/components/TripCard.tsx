import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Badge } from './ui/Badge'
import { Card } from './ui/Card'
import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'
import { theme } from '../theme'
import type { Trip } from '../lib/mockData'

type Props = {
  trip: Trip
  onPress: () => void
  showStatus?: boolean
}

export function TripCard({ trip, onPress, showStatus = false }: Props) {
  const date = new Date(trip.departureDate)
  const dateStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const accessibilitySummary = [
    `${trip.originCity} a ${trip.destinationCity}`,
    `sale ${dateStr} a las ${timeStr}`,
    trip.availableSeats > 0 ? `${trip.availableSeats} asientos disponibles` : null,
    trip.availableKg > 0 ? `${trip.availableKg} kilos de carga` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Reveal>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilitySummary}
        accessibilityHint="Abre el detalle del viaje."
      >
        <Card style={styles.surface}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{trip.driver.initials}</Text>
            </View>
            <View style={styles.driverInfo}>
              <View style={styles.driverRow}>
                <Text style={styles.driverName}>{trip.driver.name}</Text>
                {trip.driver.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Icon name="shield" size={12} color={theme.colors.icon.inverse} />
                  </View>
                ) : null}
              </View>
              <View style={styles.ratingRow}>
                <Icon name="star" size={14} color={theme.colors.icon.accent} />
                <Text style={styles.ratingCount}>
                  {trip.driver.rating} ({trip.driver.ratingCount})
                </Text>
              </View>
            </View>
            {showStatus ? <Badge status={trip.status} /> : null}
          </View>

          <View style={styles.route}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.originDot]} />
              <Text style={styles.city}>{trip.originCity}</Text>
            </View>
            <View style={styles.routeLineWrap}>
              <View style={styles.routeLine} />
              <Icon name="arrow-right" size={14} color={theme.colors.icon.muted} />
            </View>
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.destinationDot]} />
              <Text style={styles.city}>{trip.destinationCity}</Text>
            </View>
          </View>

          <View style={styles.info}>
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <Icon name="calendar" size={14} color={theme.colors.icon.muted} />
                <Text style={styles.infoLabel}>Fecha</Text>
              </View>
              <Text style={styles.infoValue}>{dateStr}</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <Icon name="clock" size={14} color={theme.colors.icon.muted} />
                <Text style={styles.infoLabel}>Salida</Text>
              </View>
              <Text style={styles.infoValue}>{timeStr}</Text>
            </View>
            {trip.availableSeats > 0 ? (
              <View style={styles.infoItem}>
                <View style={styles.infoLabelRow}>
                  <Icon name="users" size={14} color={theme.colors.icon.muted} />
                  <Text style={styles.infoLabel}>Asientos</Text>
                </View>
                <Text style={styles.infoValue}>
                  {trip.availableSeats} · ${trip.pricePerSeat.toLocaleString()}
                </Text>
              </View>
            ) : null}
            {trip.availableKg > 0 ? (
              <View style={styles.infoItem}>
                <View style={styles.infoLabelRow}>
                  <Icon name="package" size={14} color={theme.colors.icon.muted} />
                  <Text style={styles.infoLabel}>Carga</Text>
                </View>
                <Text style={styles.infoValue}>
                  {trip.availableKg} kg · ${trip.pricePerKg}/kg
                </Text>
              </View>
            ) : null}
          </View>

          {trip.notes ? (
            <View style={styles.noteRow}>
              <Icon name="message-circle" size={14} color={theme.colors.icon.secondary} />
              <Text style={styles.notes} numberOfLines={1}>
                {trip.notes}
              </Text>
            </View>
          ) : null}
        </Card>
      </TouchableOpacity>
    </Reveal>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  surface: {
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.background.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    ...theme.textStyles.label,
    color: theme.colors.text.inverse,
  },
  driverInfo: {
    flex: 1,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  driverName: {
    ...theme.textStyles.body,
    color: theme.colors.text.primary,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingCount: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  route: {
    gap: theme.spacing.sm,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  originDot: {
    backgroundColor: theme.colors.background.brand,
  },
  destinationDot: {
    backgroundColor: theme.colors.action.accent,
  },
  city: {
    ...theme.textStyles.titleSmall,
    color: theme.colors.text.primary,
  },
  routeLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: 4,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: theme.colors.border.default,
    marginVertical: 2,
  },
  info: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  infoItem: {
    minWidth: '45%',
    gap: 4,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  infoValue: {
    ...theme.textStyles.label,
    color: theme.colors.text.primary,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notes: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    flex: 1,
  },
})
