import { View, ActivityIndicator } from 'react-native'
import { Colors } from '../constants/colors'

// El auth guard en _layout.tsx redirige automáticamente a /onboarding o /(tabs)
export default function IndexScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.amber} size="large" />
    </View>
  )
}
