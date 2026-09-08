import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'
import type { PayloadUser } from '@/lib/api'

interface AuthContextValue {
  user: PayloadUser | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<PayloadUser>
  registerFirst: (data: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<PayloadUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PayloadUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ user: PayloadUser | null }>('/api/users/me')
      .then((res) => {
        if (!cancelled) setUser(res.user ?? null)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    // users collection uses loginWithUsername (allowEmailLogin) — the identifier
    // goes in `username`; backend hooks normalize it to email/phone.
    const res = await api.post<{ user: PayloadUser }>('/api/users/login', {
      username: identifier.trim(),
      password,
    })
    setUser(res.user)
    return res.user
  }, [])

  const registerFirst = useCallback(
    async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
      const res = await api.post<{ user: PayloadUser }>('/api/users/first-register', {
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'admin',
      })
      setUser(res.user)
      return res.user
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/api/users/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, registerFirst, logout }),
    [user, loading, login, registerFirst, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
