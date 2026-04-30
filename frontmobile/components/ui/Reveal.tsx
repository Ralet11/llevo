import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

type Props = {
  children: ReactNode
  delay?: number
  duration?: number
  distance?: number
  style?: StyleProp<ViewStyle>
}

export function Reveal({
  children,
  delay = 0,
  duration = 360,
  distance = 12,
  style,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(distance)).current

  useEffect(() => {
    let mounted = true

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotionEnabled) => {
        if (!mounted) return

        if (reduceMotionEnabled) {
          opacity.setValue(1)
          translateY.setValue(0)
          return
        }

        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start()
      })
      .catch(() => {
        opacity.setValue(1)
        translateY.setValue(0)
      })

    return () => {
      mounted = false
    }
  }, [delay, distance, duration, opacity, translateY])

  return (
    <Animated.View
      style={[
        {
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}
