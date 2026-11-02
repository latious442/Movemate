import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useDemoAuth } from '../auth/useDemoAuth'

type Mode = 'login' | 'register'

export function AuthPage() {
  const { user, login, register, verifyRegistration } = useDemoAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [registrationStep, setRegistrationStep] = useState<'details' | 'code'>('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/profile" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const result =
        mode === 'login'
          ? await login(email, password)
          : registrationStep === 'details'
            ? await register(name, email, password)
            : await verifyRegistration(email, code)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (mode === 'register' && registrationStep === 'details') {
        setRegistrationStep('code')
        return
      }

      navigate('/profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page page--auth">
      <header className="page__header page__header--auth">
        <h1>
          {mode === 'login'
            ? 'Welcome back'
            : registrationStep === 'code'
              ? 'Verify your email'
              : 'Create account'}
        </h1>
        <p className="muted">
          {mode === 'login'
            ? 'Sign in to manage your MoveMate profile.'
            : registrationStep === 'code'
              ? `Enter the 6-digit code sent to ${email}.`
              : 'Join MoveMate and connect with your campus community.'}
        </p>
      </header>

      <div className="auth-card">
        <div className="auth-card__tabs" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-card__tab${mode === 'login' ? ' auth-card__tab--active' : ''}`}
            onClick={() => {
              setMode('login')
              setRegistrationStep('details')
              setCode('')
              setError(null)
            }}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-card__tab${mode === 'register' ? ' auth-card__tab--active' : ''}`}
            onClick={() => {
              setMode('register')
              setRegistrationStep('details')
              setCode('')
              setError(null)
            }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && registrationStep === 'details' && (
            <label className="auth-form__field">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Chen"
                autoComplete="name"
                required
              />
            </label>
          )}

          {(mode === 'login' || registrationStep === 'details') && (
            <>
              <label className="auth-form__field">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="auth-form__field">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 4 characters' : 'Your password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={mode === 'register' ? 4 : undefined}
                  required
                />
              </label>
            </>
          )}

          {mode === 'register' && registrationStep === 'code' && (
            <>
              <label className="auth-form__field">
                Verification code
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="6-digit code"
                  required
                />
              </label>
              <button
                type="button"
                className="auth-form__edit"
                onClick={() => {
                  setRegistrationStep('details')
                  setCode('')
                  setError(null)
                }}
              >
                Change registration details
              </button>
            </>
          )}

          {error && <p className="auth-form__error">{error}</p>}

          <button type="submit" className="auth-form__submit" disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Log in'
                : registrationStep === 'code'
                  ? 'Verify and create account'
                  : 'Send verification code'}
          </button>
        </form>

      </div>

      <p className="auth-back">
        <Link to="/">← Back to home</Link>
      </p>
    </main>
  )
}
