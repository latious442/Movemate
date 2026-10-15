import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

type PaymentMethod = 'cash' | 'bank' | 'qr' | 'online'

const THREAD = {
  seller: 'Maya L.',
  item: 'Wooden Desk Chair',
  price: 45,
  avatar:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
  itemPhoto:
    'https://images.unsplash.com/photo-1506439773649-6e0eb73cfb3e?w=120&h=120&fit=crop',
}

export function MessagesPanel() {
  const [searchParams] = useSearchParams()
  const toUser = searchParams.get('to')
  const sellerName = toUser || THREAD.seller
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [draft, setDraft] = useState(toUser ? `Hi! I'm interested in your listing.` : '')

  return (
    <main className="messages-page">
      <div className="messages-layout card">
        <aside className="messages-sidebar">
          <h2 className="messages-sidebar__title">Messages</h2>
          <button type="button" className="thread-preview thread-preview--active">
            <img src={THREAD.itemPhoto} alt="" className="thread-preview__thumb" />
            <div className="thread-preview__body">
              <span className="thread-preview__name">{sellerName}</span>
              <span className="thread-preview__item">{THREAD.item}</span>
              <span className="thread-preview__snippet">Yes it is! Happy to answer any qu…</span>
            </div>
          </button>
        </aside>

        <div className="messages-chat">
          <header className="messages-chat__header">
            {toUser ? (
              <span className="messages-chat__avatar-letter">
                {sellerName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <img src={THREAD.avatar} alt="" className="messages-chat__avatar" />
            )}
            <div>
              <div className="messages-chat__seller">{sellerName}</div>
              <div className="messages-chat__listing">
                {toUser ? 'New conversation' : `${THREAD.item} — $${THREAD.price}`}
              </div>
            </div>
          </header>

          <div className="messages-chat__body">
            <div className="msg msg--out">
              <p>Hi! Is the desk chair still available?</p>
              <time>1:40 PM</time>
            </div>
            <div className="msg msg--in">
              <p>Yes it is! Happy to answer any questions.</p>
              <time>1:42 PM</time>
            </div>

            <div className="deal-card">
              <p className="deal-card__prompt">
                Confirm deal at <strong>${THREAD.price}</strong> — how will you pay?
              </p>
              <div className="deal-card__options">
                <PaymentOption
                  id="cash"
                  label="Cash on Pickup"
                  selected={payment}
                  onSelect={setPayment}
                  icon={<IconCash />}
                />
                <PaymentOption
                  id="bank"
                  label="Bank Transfer"
                  selected={payment}
                  onSelect={setPayment}
                  icon={<IconBank />}
                />
                <PaymentOption
                  id="qr"
                  label="QR Payment"
                  selected={payment}
                  onSelect={setPayment}
                  icon={<IconQr />}
                />
                <PaymentOption
                  id="online"
                  label="Online Payment"
                  selected={payment}
                  onSelect={setPayment}
                  icon={<IconCard />}
                />
              </div>
              <button type="button" className="deal-card__confirm">
                Confirm deal
              </button>
            </div>
          </div>

          <div className="messages-chat__toolbar">
            <button type="button" className="chip">
              <IconTag /> Make offer
            </button>
            <button type="button" className="chip">
              <IconCalendar /> Pickup / delivery
            </button>
            <button type="button" className="chip chip--accent">
              <IconCheck /> Confirm deal
            </button>
          </div>

          <form
            className="messages-compose"
            onSubmit={(e) => {
              e.preventDefault()
              setDraft('')
            }}
          >
            <input
              type="text"
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="messages-compose__send" aria-label="Send">
              <IconSend />
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function PaymentOption({
  id,
  label,
  selected,
  onSelect,
  icon,
}: {
  id: PaymentMethod
  label: string
  selected: PaymentMethod
  onSelect: (id: PaymentMethod) => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      className={`pay-option${selected === id ? ' pay-option--selected' : ''}`}
      onClick={() => onSelect(id)}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function IconCash() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconBank() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10h16M6 10V18M10 10V18M14 10V18M18 10V18M3 18h18M12 4l9 6H3l9-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconQr() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14h2v2h-2zM18 14h2v6h-6v-2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconCard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12l-8 8-4-4V8h4l8 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M4 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}
