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

  function handleFavoriteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    void toggleFavorite(item.id)
  }

  function handleOwnerClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (item.ownerId && item.ownerId !== user?.id) {
      navigate(`/messages?to=${encodeURIComponent(item.ownerId)}`)
    }
  }

  const rawStatus = (item.status || (item.quantity === 0 ? 'Sold' : 'Available')).trim()
  const statusKey = rawStatus.toLowerCase()
  const statusLabel =
    statusKey === 'sold' ? 'Sold' : statusKey === 'reserved' ? 'Reserved' : 'Available'
  const isVerified = item.verifiedStudent !== false

  return (
    <article className="item-card">
      <div className="item-card__image-container">
        {item.photoUrl ? (
          <img className="item-card__photo" src={item.photoUrl} alt={item.name} loading="lazy" />
        ) : (
          <div className="item-card__photo item-card__photo--empty" aria-label="No photo available">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>No photo</span>
          </div>
        )}

        {isVerified && (
          <div className="item-card__badge-verified" title="Verified Student">
            <span className="item-card__badge-dot" aria-hidden />
            <span className="item-card__badge-text">VERIFIED STUDENT</span>
          </div>
        )}
        <span className={`item-card__status item-card__status--${statusLabel.toLowerCase()}`}>
          {statusLabel}
        </span>

        <button
          type="button"
          className={`item-card__favorite${favorite ? ' item-card__favorite--active' : ''}`}
          aria-label={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`}
          aria-pressed={favorite}
          disabled={!authReady || favoritesLoading || isPending(item.id)}
          onClick={handleFavoriteClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={favorite ? '#e11d48' : 'none'} stroke={favorite ? '#e11d48' : 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      <div className="item-card__details">
        <div className="item-card__header-row">
          <h3 className="item-card__title" title={item.name}>{item.name}</h3>
          <span className="item-card__price">
            {item.price > 0 ? `$${item.price}` : 'Free'}
          </span>
        </div>

        <div className="item-card__meta-row">
          <span className="item-card__meta-text">
            {[item.university || 'Campus', item.condition || 'Gently Used'].filter(Boolean).join(' · ')}
          </span>
        </div>
        {item.ownerName && (
          <div className="item-card__seller-row">
            <div className="item-card__seller">
              <span className="item-card__owner-avatar" aria-hidden="true">
                {item.ownerName.trim().charAt(0).toUpperCase()}
              </span>
              <span className="item-card__seller-copy">
                <span className="item-card__seller-label">Listed by</span>
                <span className="item-card__owner-name" title={item.ownerName}>
                  {item.ownerName}
                </span>
              </span>
            </div>
            {item.ownerId && item.ownerId !== user?.id && (
              <button
                type="button"
                className="item-card__msg-btn"
                onClick={handleOwnerClick}
                title={`Message ${item.ownerName}`}
                aria-label={`Message ${item.ownerName}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
