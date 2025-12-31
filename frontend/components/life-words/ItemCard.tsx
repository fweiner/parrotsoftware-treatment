'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface Item {
  id: string
  name: string
  photo_url: string
  purpose?: string
  features?: string
  category?: string
  size?: string
  shape?: string
  color?: string
  weight?: string
  location?: string
  associated_with?: string
  is_active: boolean
}

interface ItemCardProps {
  item: Item
  onDelete?: (id: string) => void
  showActions?: boolean
}

export function ItemCard({ item, onDelete, showActions = true }: ItemCardProps) {
  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to remove ${item.name}?`)) {
      onDelete(item.id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-100 hover:border-blue-200 transition-colors">
      <div className="relative w-full h-48">
        <Image
          src={item.photo_url}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>

        {item.category && (
          <p className="text-[var(--color-primary)] font-semibold mt-1">
            {item.category}
          </p>
        )}

        {item.purpose && (
          <p className="text-gray-500 text-sm mt-2 line-clamp-2">{item.purpose}</p>
        )}

        {showActions && (
          <div className="flex gap-2 mt-4">
            <Link
              href={`/dashboard/treatments/life-words/items/${item.id}/edit`}
              className="flex-1 text-center py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-sm transition-colors"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
