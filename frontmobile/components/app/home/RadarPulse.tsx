import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { Theme } from '../../../constants/theme'
import { useTheme } from '../../../lib/theme'

const RING_COUNT = 3
const RING_DURATION_MS = 2400
const RING_SIZE = 140
const DOT_SIZE = 14

// Pulso tipo radar (círculos concéntricos) para el estado "buscando pedidos".
// Sin GPS ni tiles: puramente cosmético, cero costo de mapas/batería.
export function RadarPulse() {
  const { palette } = useTheme()
  const colors = palette.colors
  const styles = createStyles(colors)
  const rings = useRef(Array.from({ length: RING_COUNT }, () => new Animated.Value(0))).current

  useEffect(() => {
    const loops = rings.map(value =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: RING_DURATION_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )
    )
    const timers = loops.map((loop, i) => setTimeout(() => loop.start(), i * (RING_DURATION_MS / RING_COUNT)))
    return () => {
      timers.forEach(clearTimeout)
      loops.forEach(loop => loop.stop())
    }
  }, [rings])

  return (
    <View style={styles.container} pointerEvents="none">
      {rings.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              opacity: value.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 0.2, 0] }),
              transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
            },
          ]}
        />
      ))}
      <View style={styles.dot} />
    </View>
  )
}

const createStyles = (colors: typeof Theme.colors) => StyleSheet.create({
  container: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    borderWidth: 1.5, borderColor: colors.lime,
  },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.lime,
    shadowColor: colors.lime, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
})
