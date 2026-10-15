import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as demoAuth from './demoAuth'
import type { DemoSession } from './demoAuth'
import { DemoAuthContext } from './demoAuthContext'

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoSession | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void demoAuth.loadSession().then((session) => {
      if (!cancelled) {
        setUser(session)
        setAuthReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await demoAuth.register(name, email, password)
    if (result.ok) setUser(await demoAuth.loadSession())
    return result
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await demoAuth.login(email, password)
    if (result.ok) setUser(await demoAuth.loadSession())
    return result
  }, [])

  const logout = useCallback(async () => {
    await demoAuth.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, authReady, register, login, logout }),
    [user, authReady, register, login, logout],
  )

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>
}
