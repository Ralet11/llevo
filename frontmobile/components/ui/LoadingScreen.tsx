import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme'
import { BrandMark } from './BrandMark'

type Props = {
  title?: string
  subtitle?: string
}

export function LoadingScreen({
  title = 'Preparando tu próximo viaje',
  subtitle = 'Sincronizando tu sesión y dejando lista la app.',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.glowA} />
      <View style={styles.glowB} />
      <BrandMark tone="inverse" withCaption />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <ActivityIndicator color={theme.colors.action.accent} size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brand,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.xxl,
  },
  glowA: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.14)',
  },
  glowB: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(78, 122, 167, 0.18)',
  },
  copy: {
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...theme.textStyles.h3,
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.textStyles.body,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
})
