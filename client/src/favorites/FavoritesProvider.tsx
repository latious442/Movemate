import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api'
import { useDemoAuth } from '../auth/useDemoAuth'
import { EMPTY_FAVORITE_IDS, FavoritesContext } from './useFavorites'

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useDemoAuth()
  const [favorites, setFavorites] = useState<{ email: string; ids: string[] } | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const email = user?.email

  useEffect(() => {
    if (!authReady || !email) return

    let active = true
    api.listFavorites()
      .then((ids) => {
        if (active) setFavorites({ email, ids })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setFavorites({ email, ids: [] })
        setError(cause instanceof Error ? cause.message : 'Could not load favorites.')
      })
    return () => {
      active = false
    }
  }, [authReady, email])

  const favoriteIds =
    favorites !== null && favorites.email === email ? favorites.ids : EMPTY_FAVORITE_IDS
  const loading = Boolean(authReady && email && favorites?.email !== email)

  const toggleFavorite = useCallback(async (itemId: string) => {
    if (!email || pendingIds.has(itemId)) return

    const wasFavorite =
      favorites !== null && favorites.email === email && favorites.ids.includes(itemId)
    setError(null)
    setPendingIds((current) => new Set(current).add(itemId))
    setFavorites((current) => {
      const ids = current !== null && current.email === email ? current.ids : []
      return {
        email,
        ids: wasFavorite ? ids.filter((id) => id !== itemId) : [...ids, itemId],
      }
    })

    try {
      if (wasFavorite) {
        await api.removeFavorite(itemId)
      } else {
        await api.addFavorite(itemId)
      }
    } catch (cause) {
      setFavorites((current) => {
        const ids = current !== null && current.email === email ? current.ids : []
        return {
          email,
          ids: wasFavorite
            ? [...new Set([...ids, itemId])]
            : ids.filter((id) => id !== itemId),
        }
      })
      setError(cause instanceof Error ? cause.message : 'Could not update this favorite.')
    } finally {
      setPendingIds((current) => {
        const next = new Set(current)
        next.delete(itemId)
        return next
      })
    }
  }, [email, favorites, pendingIds])

  const isFavorite = useCallback(
    (itemId: string) => favoriteIds.includes(itemId),
    [favoriteIds],
  )
  const isPending = useCallback((itemId: string) => pendingIds.has(itemId), [pendingIds])
  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({ favoriteIds, loading, isFavorite, isPending, toggleFavorite, error, clearError }),
    [favoriteIds, loading, isFavorite, isPending, toggleFavorite, error, clearError],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
