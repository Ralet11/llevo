import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { Theme } from '../../constants/theme'

type Props = {
  initials: string
  size?: number
  style?: ViewStyle
}

export function Avatar({ initials, size = 48, style }: Props) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.42) }]}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8D24C7',
    borderWidth: 1.5,
    borderColor: Theme.colors.limeSoft,
  },
  initials: {
    color: Theme.colors.text,
    fontFamily: Theme.fonts.display,
  },
})
