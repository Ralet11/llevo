import type { ComponentProps } from 'react'
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { theme } from '../../theme'
import { Icon } from './Icon'

type Props = {
  label: string
  description?: string
  icon?: ComponentProps<typeof Icon>['name']
  onPress: () => void
  danger?: boolean
}

export function ListItem({ label, description, icon = 'circle', onPress, danger = false }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Icon
          name={icon}
          size={16}
          color={danger ? theme.colors.icon.danger : theme.colors.icon.brand}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Icon name="chevron-right" size={18} color={theme.colors.icon.muted} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.brandSoft,
  },
  iconWrapDanger: {
    backgroundColor: theme.colors.background.dangerSoft,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...theme.textStyles.body,
    color: theme.colors.text.primary,
  },
  labelDanger: {
    color: theme.colors.text.danger,
  },
  description: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
  },
})
