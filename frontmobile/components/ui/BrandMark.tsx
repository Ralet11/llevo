import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../../theme'
import { Icon } from './Icon'

type Props = {
  tone?: 'default' | 'inverse'
  withCaption?: boolean
}

export function BrandMark({ tone = 'default', withCaption = false }: Props) {
  const inverse = tone === 'inverse'

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, inverse && styles.badgeInverse]}>
        <View style={[styles.iconWrap, inverse && styles.iconWrapInverse]}>
          <Icon
            name="truck"
            size={16}
            color={inverse ? theme.colors.icon.brand : theme.colors.icon.inverse}
          />
        </View>
        <Text style={[styles.wordmark, inverse && styles.wordmarkInverse]}>LLEVO</Text>
      </View>
      {withCaption ? (
        <Text style={[styles.caption, inverse && styles.captionInverse]}>
          movilidad colaborativa entre ciudades
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  badgeInverse: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: theme.colors.border.inverse,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brand,
  },
  iconWrapInverse: {
    backgroundColor: theme.colors.action.accent,
  },
  wordmark: {
    ...theme.textStyles.label,
    color: theme.colors.text.brand,
    letterSpacing: 1.2,
  },
  wordmarkInverse: {
    color: theme.colors.text.inverse,
  },
  caption: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  captionInverse: {
    color: 'rgba(255,255,255,0.72)',
  },
})
