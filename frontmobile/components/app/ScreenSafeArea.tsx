import { ReactNode } from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import { Edge, SafeAreaView } from 'react-native-safe-area-context'

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  edges?: Edge[]
}

export function ScreenSafeArea({ children, style, edges = ['top', 'bottom'] }: Props) {
  return (
    <SafeAreaView style={style} edges={edges}>
      {children}
    </SafeAreaView>
  )
}
