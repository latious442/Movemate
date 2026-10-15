import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Item } from '../types'

export interface NewItemValues {
  name: string
  category: string
  quantity: number
  notes: string
  file: File | null
  price: number
  condition: string
  university: string
  campusPickup: boolean
  localDelivery: boolean
  moveOutBundle: boolean
}

interface ItemFormProps {
  submitting: boolean
  defaultUniversity: string
  initialItem?: Item
  onSubmit: (values: NewItemValues) => Promise<void> | void
}

const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Appliances',
  'Bedroom',
  'Kitchen',
  'Study Essentials',
  'Free Items',
  'Move-out bundle',
]
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair']
const UNIVERSITIES = [
  'Stanford University',
  'UC Berkeley',
  'UCLA',
  'MIT',
  'Harvard University',
]

function empty(defaultUniversity: string): NewItemValues {
  return {
    name: '',
    category: 'Furniture',
    quantity: 1,
    notes: '',
    file: null,
    price: 0,
    condition: 'New',
    university: defaultUniversity,
    campusPickup: true,
    localDelivery: false,
    moveOutBundle: false,
  }
}

export function ItemForm({
  submitting,
  defaultUniversity,
  initialItem,
  onSubmit,
}: ItemFormProps) {
  const [values, setValues] = useState<NewItemValues>(() =>
    initialItem
      ? {
          ...empty(initialItem.university || defaultUniversity),
          name: initialItem.name,
          category: initialItem.category,
          quantity: initialItem.quantity,
          notes: initialItem.notes,
          price: initialItem.price,
          condition: initialItem.condition,
          university: initialItem.university,
          campusPickup: initialItem.campusPickup,
          localDelivery: initialItem.localDelivery,
          moveOutBundle: initialItem.category === 'Move-out bundle',
        }
      : empty(defaultUniversity),
  )
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verified, setVerified] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialItem?.photoUrl ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!values.file) {
      setPhotoPreview(initialItem?.photoUrl ?? null)
      return
    }
    const url = URL.createObjectURL(values.file)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [values.file, initialItem?.photoUrl])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.name.trim()) return
    await onSubmit(values)
    setValues(empty(defaultUniversity))
    setVerifyEmail('')
    setVerified(false)
  }

  function handleVerify() {
    if (verifyEmail.includes('@') && verifyEmail.includes('.')) {
      setVerified(true)
    }
  }

  function handlePhotoChange(file: File | null) {
    setValues({ ...values, file })
  }

  function handleMoveOutBundle(checked: boolean) {
    setValues((current) => ({
      ...current,
      moveOutBundle: checked,
      category: checked
        ? 'Move-out bundle'
        : current.category === 'Move-out bundle'
          ? 'Furniture'
          : current.category,
    }))
  }

  return (
    <form className="sell-form" onSubmit={handleSubmit}>
      <div className="sell-form__photo">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="sell-photo"
          onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={`sell-form__photo-drop${photoPreview ? ' sell-form__photo-drop--filled' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {photoPreview ? (
            <>
              <img src={photoPreview} alt="" className="sell-form__photo-preview" />
              <span className="sell-form__photo-change">Change photo</span>
            </>
          ) : (
            <>
              <CameraIcon />
              <span className="sell-form__photo-label">Add a photo</span>
            </>
          )}
        </button>
      </div>

      <label className="sell-form__field" htmlFor="sell-item-name">
        Item name
        <input
          id="sell-item-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="e.g. Mini fridge"
          required
        />
      </label>

      <div className="sell-form__bundle">
        <div className="sell-form__bundle-copy">
          <strong>Move-out bundle</strong>
          <p>Sell several related essentials together.</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={values.moveOutBundle}
            onChange={(e) => handleMoveOutBundle(e.target.checked)}
          />
          <span className="toggle__track" aria-hidden />
          <span className="sr-only">Move-out bundle</span>
        </label>
      </div>

      <div className={`verify-banner${verified ? ' verify-banner--done' : ''}`}>
        <div className="verify-banner__head">
          <ShieldIcon />
          <div>
            <strong>University verification</strong>
            <p>Use your university email to earn the Verified Student badge.</p>
          </div>
        </div>
        {verified ? (
          <p className="verify-banner__success">Verified — badge will show on your listing.</p>
        ) : (
          <div className="verify-banner__row">
            <input
              type="email"
              placeholder="name@university.edu"
              value={verifyEmail}
              onChange={(e) => setVerifyEmail(e.target.value)}
            />
            <button type="button" className="verify-banner__btn" onClick={handleVerify}>
              Verify
            </button>
          </div>
        )}
      </div>

      <fieldset className="sell-form__handoff">
        <legend>Handoff options</legend>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={values.campusPickup}
            onChange={(e) => setValues({ ...values, campusPickup: e.target.checked })}
          />
          Campus pickup
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={values.localDelivery}
            onChange={(e) => setValues({ ...values, localDelivery: e.target.checked })}
          />
          Local delivery
        </label>
      </fieldset>

      <div className="sell-form__grid">
        <label className="sell-form__field">
          Price ($)
          <input
            type="number"
            min={0}
            step={1}
            value={values.price || ''}
            onChange={(e) => setValues({ ...values, price: Number(e.target.value) || 0 })}
            placeholder="25"
          />
        </label>

        <label className="sell-form__field">
          Category
          <span className="select-wrap">
            <select
              value={values.category}
              onChange={(e) =>
                setValues({
                  ...values,
                  category: e.target.value,
                  moveOutBundle: e.target.value === 'Move-out bundle',
                })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="sell-form__field">
          Condition
          <span className="select-wrap">
            <select
              value={values.condition}
              onChange={(e) => setValues({ ...values, condition: e.target.value })}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="sell-form__field">
          University
          <span className="select-wrap select-wrap--accent">
            <select
              value={values.university}
              onChange={(e) => setValues({ ...values, university: e.target.value })}
            >
              {UNIVERSITIES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <label className="sell-form__field">
        Description
        <textarea
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
          placeholder="A few words about your item"
          rows={4}
        />
      </label>

      <button type="submit" className="sell-form__submit" disabled={submitting}>
        {submitting ? (initialItem ? 'Saving…' : 'Posting…') : initialItem ? 'Save Changes' : 'Post Listing'}
      </button>
    </form>
  )
}

function CameraIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="sell-form__photo-icon"
    >
      <path
        d="M4 7h3l1.5-2h7L17 7h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden className="verify-banner__icon">
      <path
        d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
