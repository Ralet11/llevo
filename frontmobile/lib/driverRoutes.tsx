import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'
import type { DriverRoute } from '../app/driver/_panel'

type DriverRoutesContextType = {
  routes: DriverRoute[]
  loading: boolean
  localBusy: boolean
  localRoutes: DriverRoute[]
  isLocalOnline: boolean
  onlineCities: string[]
  localCity: string
  refetchRoutes: () => Promise<void>
  setLocalOnline: (online: boolean) => Promise<void>
  toggleRoute: (routeId: string, isActive: boolean) => Promise<void>
  deleteRoute: (routeId: string) => Promise<void>
}

const DriverRoutesContext = createContext<DriverRoutesContextType | null>(null)

// Fuente unica de "mis rutas" para todo el modo conductor: evita que cada tab
// (home, rutas, calendario...) haga su propio fetch a /drivers/routes/mine y
// mantenga su propia nocion de "estoy online" desincronizada de las demas.
export function DriverRoutesProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [routes, setRoutes] = useState<DriverRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [localBusy, setLocalBusy] = useState(false)

  const refetchRoutes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.get<{ routes: DriverRoute[] }>('/drivers/routes/mine', token)
      setRoutes(data.routes)
    } catch {} finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refetchRoutes()
  }, [refetchRoutes])

  const localRoutes = routes.filter(r => r.kind === 'LOCAL')
  const isLocalOnline = localRoutes.some(r => r.isActive)
  const onlineCities = Array.from(new Set(localRoutes.filter(r => r.isActive).map(r => r.originCity)))
  const localCity = localRoutes[0]?.originCity ?? 'tu zona'

  async function setLocalOnline(online: boolean) {
    if (!token) return
    const targets = localRoutes.filter(r => r.isActive !== online)
    if (targets.length === 0) return
    setLocalBusy(true)
    try {
      await Promise.all(targets.map(r => api.patch(`/drivers/routes/${r.id}`, { isActive: online }, token)))
      setRoutes(prev => prev.map(r => (r.kind === 'LOCAL' ? { ...r, isActive: online } : r)))
    } catch {} finally {
      setLocalBusy(false)
    }
  }

  async function toggleRoute(routeId: string, isActive: boolean) {
    if (!token) return
    await api.patch(`/drivers/routes/${routeId}`, { isActive }, token)
    setRoutes(prev => prev.map(r => (r.id === routeId ? { ...r, isActive } : r)))
  }

  async function deleteRoute(routeId: string) {
    if (!token) return
    await api.delete(`/drivers/routes/${routeId}`, token)
    setRoutes(prev => prev.filter(r => r.id !== routeId))
  }

  return (
    <DriverRoutesContext.Provider
      value={{
        routes,
        loading,
        localBusy,
        localRoutes,
        isLocalOnline,
        onlineCities,
        localCity,
        refetchRoutes,
        setLocalOnline,
        toggleRoute,
        deleteRoute,
      }}
    >
      {children}
    </DriverRoutesContext.Provider>
  )
}

export function useDriverRoutes() {
  const ctx = useContext(DriverRoutesContext)
  if (!ctx) throw new Error('useDriverRoutes debe usarse dentro de DriverRoutesProvider')
  return ctx
}
