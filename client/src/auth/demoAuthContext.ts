import { createContext } from 'react'
import type { DemoSession } from './demoAuth'

export type DemoAuthContextValue = {
  user: DemoSession | null
  authReady: boolean
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
}

export const DemoAuthContext = createContext<DemoAuthContextValue | null>(null)