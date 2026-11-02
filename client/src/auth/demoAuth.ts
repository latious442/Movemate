import { api } from '../api'
import type { AuthUser } from '../api'
import { clearAuthToken, getAuthToken, setAuthToken } from './sessionStorage'

export type DemoSession = AuthUser

const ALLOWED_DOMAIN_SUFFIXES = ['.edu', '.edu.mm']
const ALLOWED_DOMAINS = [
  'bu.ac.th',
  'dome.tu.ac.th',
  'rsu.ac.th',
  'stu.ac.th',
  'stu.pim.ac.th',
  'kbu.ac.th',
]

export function validateUniversityEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase()
  const [localPart, domain, ...extraParts] = cleaned.split('@')
  const hasValidFormat =
    Boolean(localPart && domain) && extraParts.length === 0 && !/\s/.test(cleaned)
  const hasAllowedDomain =
    Boolean(domain) &&
    (ALLOWED_DOMAINS.includes(domain) ||
      ALLOWED_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix)))

  return hasValidFormat && hasAllowedDomain
    ? null
    : 'Use a valid email address from an approved university domain.'
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
  const emailError = validateUniversityEmail(email)
  if (emailError) return { ok: false, error: emailError }

  try {
    await api.authRegister({ name, email, password })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Registration failed.' }
  }
}

export async function verifyRegistration(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { token } = await api.authVerifyRegistration({ email, code })
    setAuthToken(token)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Verification failed.' }
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
