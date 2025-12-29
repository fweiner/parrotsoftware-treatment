'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface Contact {
  id: string
  name: string
  nickname?: string
  relationship: string
  photo_url: string
  category?: string
  description?: string
  is_active: boolean
}

interface ContactCardProps {
  contact: Contact
  onDelete?: (id: string) => void
  showActions?: boolean
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: 'Spouse/Partner',
  child: 'Son/Daughter',
  grandchild: 'Grandchild',
  parent: 'Parent',
  sibling: 'Brother/Sister',
  friend: 'Friend',
  pet: 'Pet',
  caregiver: 'Caregiver',
  neighbor: 'Neighbor',
  other: 'Other',
}

export function ContactCard({ contact, onDelete, showActions = true }: ContactCardProps) {
  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to remove ${contact.name}?`)) {
      onDelete(contact.id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-100 hover:border-blue-200 transition-colors">
      <div className="relative w-full h-48">
        <Image
          src={contact.photo_url}
          alt={contact.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-900">{contact.name}</h3>

        {contact.nickname && (
          <p className="text-gray-600 text-sm">"{contact.nickname}"</p>
        )}

        <p className="text-[var(--color-primary)] font-semibold mt-1">
          {RELATIONSHIP_LABELS[contact.relationship] || contact.relationship}
        </p>

        {contact.description && (
          <p className="text-gray-500 text-sm mt-2 line-clamp-2">{contact.description}</p>
        )}

        {showActions && (
          <div className="flex gap-2 mt-4">
            <Link
              href={`/dashboard/treatments/life-words/contacts/${contact.id}/edit`}
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
