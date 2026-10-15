const categories = [
  { id: 'furniture', label: 'Furniture', Icon: IconFurniture },
  { id: 'electronics', label: 'Electronics', Icon: IconElectronics },
  { id: 'appliances', label: 'Appliances', Icon: IconAppliances },
  { id: 'bedroom', label: 'Bedroom', Icon: IconBedroom },
  { id: 'kitchen', label: 'Kitchen', Icon: IconKitchen },
  { id: 'study', label: 'Study Essentials', Icon: IconStudy },
  { id: 'free', label: 'Free Items', Icon: IconGift },
] as const

type CategoryGridProps = {
  onSelectCategory: (category: string) => void
}

export function CategoryGrid({ onSelectCategory }: CategoryGridProps) {
  return (
    <section className="categories" aria-label="Browse by category">
      <div className="categories__grid">
        {categories.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="category-card"
            onClick={() => onSelectCategory(id === 'study' ? 'Study' : capitalize(id))}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function IconFurniture() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10h16v2H4v-2zm2 2v6H6v-6h2zm10 0v6h-2v-6h2zM5 8V6a2 2 0 012-2h10a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconElectronics() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconAppliances() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7h6M9 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconBedroom() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4M4 12v4h16v-4M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconKitchen() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4v8M12 4v8M16 4v8M6 20h12l-1-8H7l-1 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconStudy() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6.5A2.5 2.5 0 016.5 4H20v16H6.5A2.5 2.5 0 014 17.5v-11z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="10" width="18" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10v11M3 14h18M8 10c-2 0-3-1-3-3s2-3 4-1 2 4 2 4-3 0-3-3zm8 0c2 0 3-1 3-3s-2-3-4-1-2 4-2 4 3 0 3-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
