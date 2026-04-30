import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BrandMark } from '../components/ui/BrandMark'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { theme } from '../theme'

const SLIDES = [
  {
    eyebrow: 'Para viajeros',
    title: 'Convertí cada trayecto en una oportunidad de ingreso.',
    description:
      'Publicá asientos o espacio de carga en minutos y aprovechá rutas que igual vas a hacer.',
    metricValue: '$8.000+',
    metricLabel: 'precio medio por asiento en rutas activas',
    icon: 'truck',
    bullets: [
      'Publicá pasajeros y paquetes en una misma salida.',
      'Definí precio, horarios y capacidad disponible.',
      'Recibí solicitudes sin salirte de tu rutina.',
    ],
  },
  {
    eyebrow: 'Para envíos urgentes',
    title: 'Mové paquetes con personas que ya viajan a tu destino.',
    description:
      'Una alternativa más rápida y flexible para encomiendas livianas entre ciudades cercanas.',
    metricValue: '15 kg',
    metricLabel: 'de capacidad media por viaje publicado',
    icon: 'package',
    bullets: [
      'Buscá por origen y destino con disponibilidad real.',
      'Elegí entre asiento, carga o ambas opciones.',
      'Resolvé entregas urgentes sin depender del correo.',
    ],
  },
  {
    eyebrow: 'Confianza y pagos',
    title: 'Coordinación simple, pago protegido y reputación visible.',
    description:
      'El dinero queda en custodia hasta la entrega y cada operación suma confianza para la siguiente.',
    metricValue: '12%',
    metricLabel: 'comisión con custodia y confirmación final',
    icon: 'shield',
    bullets: [
      'Perfiles verificados y reseñas visibles antes de aceptar.',
      'Seguimiento claro del estado de cada solicitud.',
      'Cobro liberado sólo cuando el viaje o la entrega termina bien.',
    ],
  },
] as const

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0)
  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  function next() {
    if (isLast) {
      router.replace('/auth/register')
      return
    }

    setCurrent((value) => value + 1)
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />

        <Reveal delay={30}>
          <View style={styles.topRow}>
            <BrandMark tone="inverse" withCaption />
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.replace('/auth/login')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Omitir onboarding"
            >
              <Text style={styles.skipText}>Omitir</Text>
            </TouchableOpacity>
          </View>
        </Reveal>

        <View style={styles.content}>
          <Reveal delay={80}>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </Reveal>

          <Reveal delay={140}>
            <Card style={styles.featureCard} elevated="md">
              <View style={styles.featureHeader}>
                <View style={styles.iconBadge}>
                  <Icon name={slide.icon} size={20} color={theme.colors.icon.brand} />
                </View>
                <View style={styles.metricWrap}>
                  <Text style={styles.metricValue}>{slide.metricValue}</Text>
                  <Text style={styles.metricLabel}>{slide.metricLabel}</Text>
                </View>
              </View>

              <View style={styles.routeCard}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.originDot]} />
                  <Text style={styles.routeText}>Mercedes</Text>
                </View>
                <View style={styles.routeLineRow}>
                  <View style={styles.routeLine} />
                  <Icon name="arrow-right" size={14} color={theme.colors.icon.muted} />
                </View>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, styles.destinationDot]} />
                  <Text style={styles.routeText}>Buenos Aires</Text>
                </View>
              </View>

              <View style={styles.bulletList}>
                {slide.bullets.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <View style={styles.bulletIcon}>
                      <Icon name="check" size={14} color={theme.colors.icon.brand} />
                    </View>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </Reveal>
        </View>

        <Reveal delay={200}>
          <View style={styles.footer}>
            <View style={styles.progressRow}>
              {SLIDES.map((_, index) => (
                <View key={index} style={[styles.progressDot, index === current && styles.progressDotActive]} />
              ))}
            </View>

            <Button
              label={isLast ? 'Crear mi cuenta' : 'Continuar'}
              onPress={next}
              variant="primary"
              rightIcon="arrow-right"
              accessibilityHint="Avanza al siguiente paso del onboarding."
            />

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/auth/login')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ya tengo cuenta"
            >
              <Text style={styles.loginText}>Ya tengo cuenta</Text>
            </TouchableOpacity>
          </View>
        </Reveal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.brand,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.brand,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  glowA: {
    position: 'absolute',
    top: -90,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.12)',
  },
  glowB: {
    position: 'absolute',
    bottom: 110,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(78, 122, 167, 0.16)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  skipButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border.inverse,
  },
  skipText: {
    ...theme.textStyles.label,
    color: theme.colors.text.inverse,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.xxl,
  },
  copy: {
    gap: theme.spacing.md,
  },
  eyebrow: {
    ...theme.textStyles.label,
    color: theme.colors.action.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  title: {
    ...theme.textStyles.h1,
    color: theme.colors.text.inverse,
  },
  description: {
    ...theme.textStyles.bodyLarge,
    color: 'rgba(255,255,255,0.76)',
  },
  featureCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
  },
  metricWrap: {
    flex: 1,
    gap: 2,
  },
  metricValue: {
    ...theme.textStyles.h3,
    color: theme.colors.text.primary,
  },
  metricLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  routeCard: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  routeDot: {
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
  routeLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: 4,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: theme.colors.border.default,
  },
  routeText: {
    ...theme.textStyles.titleSmall,
    color: theme.colors.text.primary,
  },
  bulletList: {
    gap: theme.spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  bulletIcon: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
    marginTop: 1,
  },
  bulletText: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  footer: {
    gap: theme.spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressDotActive: {
    width: 26,
    backgroundColor: theme.colors.action.accent,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    ...theme.textStyles.label,
    color: 'rgba(255,255,255,0.76)',
  },
})
