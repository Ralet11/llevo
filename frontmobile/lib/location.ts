import * as Location from 'expo-location'
import type { Region } from 'react-native-maps'

const DEFAULT_LAT = -34.6037
const DEFAULT_LNG = -58.3816
const DEFAULT_DELTA = 0.035

function envNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const DEFAULT_MAP_REGION: Region = {
  latitude: envNumber(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT, DEFAULT_LAT),
  longitude: envNumber(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG, DEFAULT_LNG),
  latitudeDelta: envNumber(process.env.EXPO_PUBLIC_DEFAULT_MAP_DELTA, DEFAULT_DELTA),
  longitudeDelta: envNumber(process.env.EXPO_PUBLIC_DEFAULT_MAP_DELTA, DEFAULT_DELTA),
}

export type InitialMapRegion = {
  region: Region
  permission: Location.PermissionStatus
  source: 'device' | 'fallback'
  servicesEnabled: boolean
}

export async function getForegroundPermissionStatus() {
  return Location.getForegroundPermissionsAsync()
}

function toRegion(latitude: number, longitude: number): Region {
  return {
    ...DEFAULT_MAP_REGION,
    latitude,
    longitude,
  }
}

export async function getInitialMapRegion(forceRequest = false): Promise<InitialMapRegion> {
  const servicesEnabled = await Location.hasServicesEnabledAsync()
  const currentPermission = await Location.getForegroundPermissionsAsync()
  const permission =
    forceRequest || currentPermission.status === Location.PermissionStatus.UNDETERMINED
      ? await Location.requestForegroundPermissionsAsync()
      : currentPermission

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return {
      region: DEFAULT_MAP_REGION,
      permission: permission.status,
      source: 'fallback',
      servicesEnabled,
    }
  }

  const lastKnownPosition = await Location.getLastKnownPositionAsync()
  if (lastKnownPosition) {
    return {
      region: toRegion(lastKnownPosition.coords.latitude, lastKnownPosition.coords.longitude),
      permission: permission.status,
      source: 'device',
      servicesEnabled,
    }
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  })

  return {
    region: toRegion(position.coords.latitude, position.coords.longitude),
    permission: permission.status,
    source: 'device',
    servicesEnabled,
  }
}

export async function watchUserLocation(onUpdate: (region: Region) => void) {
  const permission = await Location.getForegroundPermissionsAsync()
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return null
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Highest,
      distanceInterval: 10,
      timeInterval: 5000,
    },
    position => {
      onUpdate(toRegion(position.coords.latitude, position.coords.longitude))
    }
  )
}

export async function getAddressLabel(latitude: number, longitude: number) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude })
    const first = results[0]
    if (!first) return null

    const street = [first.street, first.streetNumber].filter(Boolean).join(' ').trim()
    const district = first.district ?? first.subregion ?? first.city ?? first.region

    if (street && district) return `${street}, ${district}`
    if (street) return street
    if (district) return district
    return null
  } catch {
    return null
  }
}
