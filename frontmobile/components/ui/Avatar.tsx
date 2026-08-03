import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'

type Props = {
  initials: string
  imageUrl?: string | null
  size?: number
  style?: ViewStyle
}

export function Avatar({ initials, imageUrl, size = 48, style }: Props) {
  const { palette } = useTheme()
  const colors = palette.colors
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted, borderColor: colors.limeSoft }, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size - 3, height: size - 3, borderRadius: (size - 3) / 2 }} />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.42), color: colors.text }]}>
          {initials.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initials: {
    fontFamily: Theme.fonts.display,
  },
})
