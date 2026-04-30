import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

type User = {
  id: string
  name: string
  email: string
  phone?: string
  rating: number
  ratingCount: number
  isVerified: boolean
}

type AuthContextType = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

type RegisterData = {
  name: string
  email: string
  phone: string
  password: string
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'llevo_token'
const USER_KEY  = 'llevo_user'

// Mock credentials para desarrollo
const MOCK_USER: User = {
  id: 'me',
  name: 'Ramiro Alet',
  email: 'ramiro.alet@gmail.com',
  phone: '11-1234-5678',
  rating: 4.7,
  ratingCount: 8,
  isVerified: true,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSession()
  }, [])

  async function loadSession() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ])
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.log('Error cargando sesión', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, _password: string) {
    // TODO: reemplazar con llamada real a la API
    await new Promise(r => setTimeout(r, 800)) // simula delay de red
    const mockToken = 'mock_token_' + Date.now()
    await SecureStore.setItemAsync(TOKEN_KEY, mockToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(MOCK_USER))
    setToken(mockToken)
    setUser(MOCK_USER)
  }

  async function register(data: RegisterData) {
    // TODO: reemplazar con llamada real a la API
    await new Promise(r => setTimeout(r, 1000))
    const newUser: User = {
      id: 'new_' + Date.now(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      rating: 0,
      ratingCount: 0,
      isVerified: false,
    }
    const mockToken = 'mock_token_' + Date.now()
    await SecureStore.setItemAsync(TOKEN_KEY, mockToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser))
    setToken(mockToken)
    setUser(newUser)
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
