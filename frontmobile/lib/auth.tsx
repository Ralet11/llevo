import React, { createContext, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { api, ApiError } from './api'

export type DriverVerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DECLINED'
  | 'RESUBMITTED'
  | 'EXPIRED'
  | 'ABANDONED'
  | 'KYC_EXPIRED'

export type User = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  city?: string
  rating: number
  ratingCount: number
  isVerified: boolean
  phoneVerifiedAt?: string | null
  driverVerificationStatus: DriverVerificationStatus
  driverVerificationSessionId?: string | null
  driverVerificationUrl?: string | null
  driverVerifiedAt?: string | null
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

type PhoneCodeIntent = 'login' | 'register'

type EmailAuthStartResponse = {
  nextStep: 'password' | 'code'
  devCode?: string
}

type PhoneRegisterData = {
  name: string
  phone: string
  code: string
  email?: string
}

type LegacyRegisterData = {
  name: string
  email: string
  phone: string
  password: string
}

type DriverVerificationSession = {
  status: DriverVerificationStatus
  sessionId?: string | null
  verificationUrl?: string | null
  alreadyVerified?: boolean
}

type DriverVerificationStatusResponse = {
  status: DriverVerificationStatus
  sessionId?: string | null
  verificationUrl?: string | null
  submittedAt?: string | null
  checkedAt?: string | null
  verifiedAt?: string | null
  notes?: string | null
  user: Partial<User> & {
    id: string
    name: string
  }
}

type AuthContextType = {
  user: User | null
  token: string | null
  driverProfile: DriverProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  startEmailAuth: (email: string) => Promise<EmailAuthStartResponse>
  verifyEmailCode: (email: string, code: string) => Promise<void>
  setEmailPassword: (email: string, code: string, password: string) => Promise<void>
  register: (data: LegacyRegisterData) => Promise<void>
  sendPhoneCode: (phone: string, intent: PhoneCodeIntent) => Promise<void>
  verifyMyPhone: (phone: string, code: string) => Promise<void>
  loginWithPhone: (phone: string, code: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  loginWithApple: (identityToken: string, fullName?: string) => Promise<void>
  registerWithPhone: (data: PhoneRegisterData) => Promise<void>
  refreshSession: () => Promise<User | null>
  startDriverVerification: (callbackUrl: string) => Promise<DriverVerificationSession>
  syncDriverVerification: (force?: boolean) => Promise<DriverVerificationStatusResponse | null>
  updateUser: (data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'city'>>) => Promise<void>
  saveDriverProfile: (data: DriverProfile) => Promise<void>
  clearDriverProfile: () => Promise<void>
  logout: () => Promise<void>
}

type AuthResponse = {
  user: Partial<User> & {
    id: string
    name: string
  }
  token: string
}

type MeResponse = {
  user: Partial<User> & {
    id: string
    name: string
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'llevo_token'
const USER_KEY = 'llevo_user'

function getDriverProfileKey(userId: string) {
  return `llevo_driver_profile_${userId}`
}

function normalizeUser(user: Partial<User> & { id: string; name: string }): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    phone: user.phone ?? null,
    city: user.city,
    rating: typeof user.rating === 'number' ? user.rating : 0,
    ratingCount: typeof user.ratingCount === 'number' ? user.ratingCount : 0,
    isVerified: Boolean(user.isVerified),
    phoneVerifiedAt: user.phoneVerifiedAt ?? null,
    driverVerificationStatus: user.driverVerificationStatus ?? 'NOT_STARTED',
    driverVerificationSessionId: user.driverVerificationSessionId ?? null,
    driverVerificationUrl: user.driverVerificationUrl ?? null,
    driverVerifiedAt: user.driverVerifiedAt ?? null,
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

  async function setPersistedUser(nextUser: User) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  async function persistSession(nextToken: string, nextUser: User) {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken)
    setToken(nextToken)
    await setPersistedUser(nextUser)
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

  async function refreshSession(currentToken = token): Promise<User | null> {
    if (!currentToken) return null

    const response = await api.get<MeResponse>('/auth/me', currentToken)
    const nextUser = normalizeUser(response.user)
    await setPersistedUser(nextUser)
    return nextUser
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

        const parsedUser = normalizeUser(JSON.parse(storedUser) as Partial<User> & { id: string; name: string })
        setToken(storedToken)
        setUser(parsedUser)
        setDriverProfile(await readDriverProfile(parsedUser.id))

        try {
          await refreshSession(storedToken)
        } catch (refreshError) {
          if (refreshError instanceof ApiError && refreshError.status === 401) {
            await SecureStore.deleteItemAsync(TOKEN_KEY)
            await SecureStore.deleteItemAsync(USER_KEY)
            setToken(null)
            setUser(null)
            setDriverProfile(null)
          } else {
            console.log('No pude refrescar la sesion con el backend', refreshError)
          }
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

  async function startEmailAuth(email: string) {
    return api.post<EmailAuthStartResponse>('/auth/email/start', { email })
  }

  async function verifyEmailCode(email: string, code: string) {
    await api.post('/auth/email/verify-code', { email, code })
  }

  async function setEmailPassword(email: string, code: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/email/set-password', { email, code, password })
    await persistSession(response.token, normalizeUser(response.user))
  }

  async function register(data: LegacyRegisterData) {
    const response = await api.post<AuthResponse>('/auth/register', data)
    const meResponse = await api.get<MeResponse>('/auth/me', response.token)
    await persistSession(response.token, normalizeUser(meResponse.user))
  }

  async function sendPhoneCode(phone: string, intent: PhoneCodeIntent) {
    await api.post('/auth/phone/send-code', { phone, intent })
  }

  // Verifica el telefono de la sesion actual (alta por Google/email) sin cambiar
  // de cuenta: actualiza el usuario con phoneVerifiedAt para destrabar el gate.
  async function verifyMyPhone(phone: string, code: string) {
    if (!token) throw new Error('No hay sesion activa')
    const response = await api.post<MeResponse>('/auth/phone/verify', { phone, code }, token)
    await setPersistedUser(normalizeUser(response.user))
  }

  async function loginWithPhone(phone: string, code: string) {
    const response = await api.post<AuthResponse>('/auth/phone/login', { phone, code })
    await persistSession(response.token, normalizeUser(response.user))
  }

  async function loginWithGoogle(idToken: string) {
    const response = await api.post<AuthResponse>('/auth/google', { idToken })
    await persistSession(response.token, normalizeUser(response.user))
  }

  async function loginWithApple(identityToken: string, fullName?: string) {
    const response = await api.post<AuthResponse>('/auth/apple', { identityToken, fullName })
    await persistSession(response.token, normalizeUser(response.user))
  }

  async function registerWithPhone(data: PhoneRegisterData) {
    const response = await api.post<AuthResponse>('/auth/phone/register', data)
    await persistSession(response.token, normalizeUser(response.user))
  }

  async function startDriverVerification(callbackUrl: string) {
    if (!token) throw new Error('No hay sesion activa')
    return api.post<DriverVerificationSession>('/drivers/verification/session', { callbackUrl }, token)
  }

  async function syncDriverVerification(force = false) {
    if (!token) return null
    const path = force ? '/drivers/verification/status?sync=1' : '/drivers/verification/status'
    const response = await api.get<DriverVerificationStatusResponse>(path, token)
    await setPersistedUser(normalizeUser(response.user))
    return response
  }

  async function updateUser(data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'city'>>) {
    if (!user) return
    const nextUser = { ...user, ...data }
    await setPersistedUser(nextUser)
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
        startEmailAuth,
        verifyEmailCode,
        setEmailPassword,
        register,
        sendPhoneCode,
        loginWithPhone,
        loginWithGoogle,
        loginWithApple,
        verifyMyPhone,
        registerWithPhone,
        refreshSession,
        startDriverVerification,
        syncDriverVerification,
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
