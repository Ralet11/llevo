import { LoadingScreen } from '../components/ui/LoadingScreen'

// The auth guard in _layout.tsx redirects to /onboarding or /(tabs).
export default function IndexScreen() {
  return <LoadingScreen />
}
