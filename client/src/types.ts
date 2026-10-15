export interface Item {
  id: string
  ownerId?: string
  ownerName?: string
  name: string
  category: string
  quantity: number
  notes: string
  price: number
  condition: string
  university: string
  campusPickup: boolean
  localDelivery: boolean
  photoUrl: string | null
  photoPublicId: string | null
  createdAt: string
  updatedAt: string
}

export interface ItemInput {
  name: string
  category?: string
  quantity?: number
  notes?: string
  price?: number
  condition?: string
  university?: string
  campusPickup?: boolean
  localDelivery?: boolean
  photoUrl?: string | null
  photoPublicId?: string | null
}

export interface UploadedPhoto {
  url: string
  publicId: string
}
