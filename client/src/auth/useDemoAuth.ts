import { useContext } from 'react'
import { DemoAuthContext } from './demoAuthContext'

export function useDemoAuth() {
  const ctx = useContext(DemoAuthContext)
  if (!ctx) throw new Error('useDemoAuth must be used within DemoAuthProvider')
  return ctx
}