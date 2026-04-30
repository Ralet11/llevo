import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../../theme'
import { Icon } from './Icon'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'default'

const MAP: Record<string, Variant> = {
  OPEN: 'success',
  ACCEPTED: 'success',
  COMPLETED: 'info',
  PENDING: 'warning',
  REJECTED: 'error',
  CANCELLED: 'error',
  FULL: 'warning',
  IN_PROGRESS: 'info',
}

const LABELS: Record<string, string> = {
  OPEN: 'Disponible',
  ACCEPTED: 'Confirmado',
  COMPLETED: 'Completado',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  FULL: 'Completo',
  IN_PROGRESS: 'En camino',
}

type Props = { status: string; label?: string }

export function Badge({ status, label }: Props) {
  const variant: Variant = MAP[status] || 'default'

  return (
    <View style={[styles.badge, styles[variant]]}>
      {variant === 'success' ? (
        <Icon name="check-circle" size={12} color={theme.colors.status.success.text} />
      ) : null}
      {variant === 'warning' ? (
        <Icon name="clock" size={12} color={theme.colors.status.warning.text} />
      ) : null}
      {variant === 'error' ? (
        <Icon name="x-circle" size={12} color={theme.colors.status.danger.text} />
      ) : null}
      {variant === 'info' ? (
        <Icon name="map-pin" size={12} color={theme.colors.status.info.text} />
      ) : null}
      <Text style={[styles.text, styles[`text_${variant}`]]}>
        {label ?? LABELS[status] ?? status}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  success: { backgroundColor: theme.colors.status.success.surface },
  warning: { backgroundColor: theme.colors.status.warning.surface },
  error: { backgroundColor: theme.colors.status.danger.surface },
  info: { backgroundColor: theme.colors.status.info.surface },
  default: { backgroundColor: theme.colors.status.neutral.surface },

  text: {
    ...theme.textStyles.caption,
  },
  text_success: { color: theme.colors.status.success.text },
  text_warning: { color: theme.colors.status.warning.text },
  text_error: { color: theme.colors.status.danger.text },
  text_info: { color: theme.colors.status.info.text },
  text_default: { color: theme.colors.status.neutral.text },
})
