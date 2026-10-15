import { UNIVERSITIES } from '../catalog'

type HeroProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  university: string
  onUniversityChange: (value: string) => void
  onFindItems: () => void
  onBrowse: () => void
  onSell: () => void
}

export function Hero({
  searchQuery,
  onSearchQueryChange,
  university,
  onUniversityChange,
  onFindItems,
  onBrowse,
  onSell,
}: HeroProps) {
  return (
    <section className="hero">
      <h1 className="hero__title">
        <span className="hero__title-line">Move In Smarter.</span>
        <span className="hero__title-line hero__title-line--accent">Move Out Easier.</span>
      </h1>
      <p className="hero__subtitle">
        Buy and sell affordable dorm essentials with students near your university.
      </p>

      <form
        className="hero__search"
        onSubmit={(e) => {
          e.preventDefault()
          onFindItems()
        }}
      >
        <label className="hero__search-field">
          <span className="sr-only">Search essentials</span>
          <SearchIcon />
          <input
            type="search"
            placeholder="Search essentials..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </label>

        <div className="hero__search-divider" aria-hidden />

        <label className="hero__search-university">
          <span className="sr-only">University</span>
          <select value={university} onChange={(e) => onUniversityChange(e.target.value)}>
            <option value="">All universities</option>
            {UNIVERSITIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </label>

        <button type="submit" className="hero__search-submit">
          Find Items
        </button>
      </form>

      <div className="hero__actions">
        <button type="button" className="btn btn--primary" onClick={onBrowse}>
          Browse Items
        </button>
        <button type="button" className="btn btn--outline" onClick={onSell}>
          Sell an Item
        </button>
      </div>
    </section>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="hero__search-icon">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="hero__chevron">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
