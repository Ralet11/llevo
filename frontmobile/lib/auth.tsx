import React, { createContext, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { api } from './api'

export type User = {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  rating: number
  ratingCount: number
  isVerified: boolean
}

export type DriverMode = 'rider' | 'viajes' | 'entrega'

export type DriverProfile = {
  mode: DriverMode
  city: string
  vehicle: string
  coverage: string
  availability: string
  notes: string
  onboardingCompleted: boolean
  updatedAt: string
}

type AuthContextType = {
  user: User | null
  token: string | null
  driverProfile: DriverProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  updateUser: (data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'city'>>) => Promise<void>
  saveDriverProfile: (data: DriverProfile) => Promise<void>
  clearDriverProfile: () => Promise<void>
  logout: () => Promise<void>
}

type RegisterData = {
  name: string
  email: string
  phone: string
  password: string
}

type AuthResponse = {
  user: Partial<User> & {
    id: string
    name: string
    email: string
  }
  token: string
}

type MeResponse = {
  user: Partial<User> & {
    id: string
    name: string
    email: string
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'llevo_token'
const USER_KEY = 'llevo_user'

function getDriverProfileKey(userId: string) {
  return `llevo_driver_profile_${userId}`
}

function normalizeUser(user: Partial<User> & { id: string; name: string; email: string }): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    rating: typeof user.rating === 'number' ? user.rating : 0,
    ratingCount: typeof user.ratingCount === 'number' ? user.ratingCount : 0,
    isVerified: Boolean(user.isVerified),
  }
}

function normalizeDriverProfile(profile: Partial<DriverProfile> & { mode: DriverMode }): DriverProfile {
  return {
    mode: profile.mode,
    city: profile.city?.trim() ?? '',
    vehicle: profile.vehicle?.trim() ?? '',
    coverage: profile.coverage?.trim() ?? '',
    availability: profile.availability?.trim() ?? '',
    notes: profile.notes?.trim() ?? '',
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSession()
  }, [])

  async function persistSession(nextToken: string, nextUser: User) {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
    setDriverProfile(await readDriverProfile(nextUser.id))
  }

  async function readDriverProfile(userId: string) {
    try {
      const rawProfile = await SecureStore.getItemAsync(getDriverProfileKey(userId))
      if (!rawProfile) return null
      const parsedProfile = JSON.parse(rawProfile) as Partial<DriverProfile> & { mode: DriverMode }
      return normalizeDriverProfile(parsedProfile)
    } catch (error) {
      console.log('Error cargando perfil de conductor', error)
      return null
    }
  }

  async function loadSession() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ])

      if (storedToken && storedUser) {
        if (storedToken.startsWith('mock_token_')) {
          await SecureStore.deleteItemAsync(TOKEN_KEY)
          await SecureStore.deleteItemAsync(USER_KEY)
          setDriverProfile(null)
          return
        }

        const parsedUser = JSON.parse(storedUser) as User
        setToken(storedToken)
        setUser(parsedUser)
        setDriverProfile(await readDriverProfile(parsedUser.id))

        try {
          const response = await api.get<MeResponse>('/auth/me', storedToken)
          const nextUser = normalizeUser(response.user)
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser))
          setUser(nextUser)
        } catch (refreshError) {
          console.log('No pude refrescar la sesion con el backend', refreshError)
        }
      }
    } catch (error) {
      console.log('Error cargando sesion', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/login', { email, password })
    await persistSession(response.token, normalizeUser(response.user))
  }

  async function register(data: RegisterData) {
    const response = await api.post<AuthResponse>('/auth/register', data)
    const meResponse = await api.get<MeResponse>('/auth/me', response.token)
    await persistSession(response.token, normalizeUser(meResponse.user))
  }

  async function updateUser(data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'city'>>) {
    if (!user) return
    const nextUser = { ...user, ...data }
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  async function saveDriverProfile(data: DriverProfile) {
    if (!user) return
    const nextProfile = normalizeDriverProfile(data)
    await SecureStore.setItemAsync(getDriverProfileKey(user.id), JSON.stringify(nextProfile))
    setDriverProfile(nextProfile)
  }

  async function clearDriverProfile() {
    if (!user) return
    await SecureStore.deleteItemAsync(getDriverProfileKey(user.id))
    setDriverProfile(null)
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setToken(null)
    setUser(null)
    setDriverProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        driverProfile,
        isLoading,
        login,
        register,
        updateUser,
        saveDriverProfile,
        clearDriverProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
