import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client'
import type { Permission, Profile } from '../api/types'

interface AuthState {
  user: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Profile>
  signOut: () => void
  refresh: () => Promise<void>
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return
    }
    try {
      setUser(await api<Profile>('/auth/me'))
    } catch {
      signOut()
    }
  }, [signOut])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    refresh().finally(() => setLoading(false))
    return () => setUnauthorizedHandler(null)
  }, [refresh, signOut])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api<{ accessToken: string; user: Profile }>('/auth/sign-in', {
      method: 'POST',
      body: { email, password },
    })
    setToken(result.accessToken)
    setUser(result.user)
    return result.user
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      refresh,
      can: (permission) => !!user?.permissions.includes(permission),
    }),
    [user, loading, signIn, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
