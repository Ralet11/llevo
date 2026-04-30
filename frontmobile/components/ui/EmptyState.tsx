import type { ComponentProps } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { theme } from '../../theme'
import { Card } from './Card'
import { Icon } from './Icon'

type Props = {
  icon?: ComponentProps<typeof Icon>['name']
  title: string
  description: string
  actionLabel?: string
  onActionPress?: () => void
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onActionPress,
}: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={24} color={theme.colors.icon.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onActionPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint={description}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: theme.spacing.jumbo,
    paddingHorizontal: theme.spacing.xxl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.textStyles.title,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.textStyles.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  action: {
    backgroundColor: theme.colors.action.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  actionText: {
    ...theme.textStyles.label,
    color: theme.colors.action.primaryText,
  },
})
