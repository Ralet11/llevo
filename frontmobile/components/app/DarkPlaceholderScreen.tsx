import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Theme } from '../../constants/theme'
import { useTheme } from '../../lib/theme'
import { ScreenSafeArea } from './ScreenSafeArea'
import { IconButton } from '../ui/IconButton'

type IconName = React.ComponentProps<typeof Ionicons>['name']

type Props = {
  title: string
  description: string
  icon: IconName
}

export function DarkPlaceholderScreen({ title, description, icon }: Props) {
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={34} color={colors.lime} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.note}>Esta seccion queda reservada para el siguiente bloque visual.</Text>
      </View>
    </ScreenSafeArea>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
  headerSpacer: {
    width: 46,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontFamily: Theme.fonts.display,
    fontSize: 28,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontFamily: Theme.fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  note: {
    color: colors.lime,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 12,
    marginTop: 20,
  },
})
