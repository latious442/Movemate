import { createContext, useContext } from 'react'

interface FavoritesContextValue {
  favoriteIds: string[]
  loading: boolean
  isFavorite: (itemId: string) => boolean
  isPending: (itemId: string) => boolean
  toggleFavorite: (itemId: string) => Promise<void>
  error: string | null
  clearError: () => void
}

export const EMPTY_FAVORITE_IDS: string[] = []
export const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider')
  return context
}
