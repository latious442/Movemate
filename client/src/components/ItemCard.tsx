import { useNavigate } from 'react-router-dom'
import { useDemoAuth } from '../auth/useDemoAuth'
import { useFavorites } from '../favorites/useFavorites'
import type { Item } from '../types'

interface ItemCardProps {
  item: Item
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate()
  const { user, authReady } = useDemoAuth()
  const { isFavorite, isPending, loading: favoritesLoading, toggleFavorite } = useFavorites()
  const favorite = isFavorite(item.id)

  function handleFavoriteClick() {
    if (!user) {
      navigate('/login')
      return
    }
    void toggleFavorite(item.id)
  }

  function handleOwnerClick(e: React.MouseEvent) {
    e.preventDefault()
    if (item.ownerName) {
      navigate(`/messages?to=${encodeURIComponent(item.ownerName)}`)
    }
  }

  return (
    <article className="card item-card">
      {item.photoUrl ? (
        <img className="item-card__photo" src={item.photoUrl} alt={item.name} loading="lazy" />
      ) : (
        <div className="item-card__photo item-card__photo--empty">No photo</div>
      )}
      <button
        type="button"
        className={`item-card__favorite${favorite ? ' item-card__favorite--active' : ''}`}
        aria-label={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`}
        aria-pressed={favorite}
        disabled={!authReady || favoritesLoading || isPending(item.id)}
        onClick={handleFavoriteClick}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 20.5l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 10.68L12 20.5z"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="item-card__body">
        {item.ownerName && (
          <a
            href={`/messages?to=${encodeURIComponent(item.ownerName)}`}
            className="item-card__owner"
            onClick={handleOwnerClick}
            title={`Message ${item.ownerName}`}
          >
            <span className="item-card__owner-avatar">
              {item.ownerName.charAt(0).toUpperCase()}
            </span>
            <span className="item-card__owner-name">{item.ownerName}</span>
            <svg className="item-card__owner-msg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
        <header>
          <h3>{item.name}</h3>
          {item.price > 0 ? (
            <span className="badge badge--price">${item.price}</span>
          ) : (
            <span className="badge">Free</span>
          )}
        </header>
        {item.category && (
          <p className="muted">
            {item.category}
            {item.condition ? ` · ${item.condition}` : ''}
          </p>
        )}
        {item.notes && <p>{item.notes}</p>}
      </div>


    </article>
  )
}
