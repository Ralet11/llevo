import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'default'

const MAP: Record<string, Variant> = {
  OPEN:        'success',
  ACCEPTED:    'success',
  COMPLETED:   'info',
  PENDING:     'warning',
  REJECTED:    'error',
  CANCELLED:   'error',
  FULL:        'warning',
  IN_PROGRESS: 'info',
}

const LABELS: Record<string, string> = {
  OPEN:        'Disponible',
  ACCEPTED:    'Confirmado',
  COMPLETED:   'Completado',
  PENDING:     'Pendiente',
  REJECTED:    'Rechazado',
  CANCELLED:   'Cancelado',
  FULL:        'Completo',
  IN_PROGRESS: 'En camino',
}

type Props = { status: string; label?: string }

export function Badge({ status, label }: Props) {
  const variant: Variant = MAP[status] || 'default'
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>
        {label ?? LABELS[status] ?? status}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  success: { backgroundColor: Colors.greenLight },
  warning: { backgroundColor: Colors.amberLight },
  error:   { backgroundColor: Colors.redLight },
  info:    { backgroundColor: Colors.blueLight },
  default: { backgroundColor: Colors.grayLight },

  text:         { fontSize: 11, fontWeight: '700' },
  text_success: { color: Colors.green },
  text_warning: { color: '#92400E' },
  text_error:   { color: Colors.red },
  text_info:    { color: Colors.navyLight },
  text_default: { color: Colors.gray },
})
