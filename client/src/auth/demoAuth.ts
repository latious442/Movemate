import { api } from '../api'
import { clearAuthToken, getAuthToken, setAuthToken } from './sessionStorage'

export type DemoSession = {
  id: string
  name: string
  email: string
}

export async function loadSession(): Promise<DemoSession | null> {
  const token = getAuthToken()
  if (!token) return null
  try {
    return await api.authMe()
  } catch {
    clearAuthToken()
    return null
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { token } = await api.authRegister({ name, email, password })
    setAuthToken(token)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Registration failed.' }
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { token } = await api.authLogin({ email, password })
    setAuthToken(token)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Login failed.' }
  }
}

export async function logout() {
  try {
    await api.authLogout()
  } catch {
    // Clear local session even if the server already dropped it.
  }
  clearAuthToken()
}

/** @deprecated use loadSession */
export function getSession(): DemoSession | null {
  return null
}
