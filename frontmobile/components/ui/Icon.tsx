import type { ComponentProps } from 'react'
import { Feather } from '@expo/vector-icons'
import { theme } from '../../theme'

type Props = ComponentProps<typeof Feather>

export function Icon({ color = theme.colors.icon.primary, size = 20, ...props }: Props) {
  return <Feather color={color} size={size} {...props} />
}
