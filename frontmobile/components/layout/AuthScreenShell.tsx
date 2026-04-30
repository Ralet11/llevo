import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../../theme'
import { Card } from '../ui/Card'
import { BrandMark } from '../ui/BrandMark'
import { Reveal } from '../ui/Reveal'

type Props = {
  eyebrow: string
  title: string
  subtitle: string
  hero?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function AuthScreenShell({ eyebrow, title, subtitle, hero, children, footer }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Reveal delay={40}>
              <View style={styles.heroArea}>
                <BrandMark tone="inverse" withCaption />
                <View style={styles.copy}>
                  <Text style={styles.eyebrow}>{eyebrow}</Text>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                {hero}
              </View>
            </Reveal>

            <Reveal delay={120}>
              <Card style={styles.formCard} elevated="md">
                {children}
              </Card>
            </Reveal>

            {footer ? (
              <Reveal delay={180}>
                <View style={styles.footer}>{footer}</View>
              </Reveal>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  flex: {
    flex: 1,
  },
  glowA: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 181, 68, 0.12)',
  },
  glowB: {
    position: 'absolute',
    top: 180,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(78, 122, 167, 0.14)',
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.xl,
  },
  heroArea: {
    gap: theme.spacing.xl,
  },
  copy: {
    gap: theme.spacing.sm,
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
  subtitle: {
    ...theme.textStyles.bodyLarge,
    color: 'rgba(255,255,255,0.74)',
  },
  formCard: {
    padding: theme.spacing.xl,
  },
  footer: {
    alignItems: 'center',
  },
})
