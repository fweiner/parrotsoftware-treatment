'use client'

import { useState } from 'react'
import { PhotoUpload } from './PhotoUpload'

export interface ContactFormData {
  name: string
  nickname: string
  relationship: string
  photo_url: string
  category: string
  description: string
  association: string
  location_context: string
}

interface ContactFormProps {
  initialData?: Partial<ContactFormData>
  onSubmit: (data: ContactFormData) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  isSubmitting?: boolean
}

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'child', label: 'Son/Daughter' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Brother/Sister' },
  { value: 'friend', label: 'Friend' },
  { value: 'pet', label: 'Pet' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'neighbor', label: 'Neighbor' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_OPTIONS = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'pet', label: 'Pet' },
  { value: 'place', label: 'Place' },
  { value: 'object', label: 'Object' },
]

export function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Contact',
  isSubmitting = false
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: initialData?.name || '',
    nickname: initialData?.nickname || '',
    relationship: initialData?.relationship || '',
    photo_url: initialData?.photo_url || '',
    category: initialData?.category || 'family',
    description: initialData?.description || '',
    association: initialData?.association || '',
    location_context: initialData?.location_context || '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, photo_url: url }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!formData.relationship) {
      setError('Relationship is required')
      return
    }
    if (!formData.photo_url) {
      setError('Please upload a photo')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setError(err.message || 'Failed to save contact')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Upload */}
      <div className="flex justify-center">
        <PhotoUpload
          onUploadComplete={handlePhotoUpload}
          currentPhotoUrl={formData.photo_url}
        />
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-lg font-semibold text-gray-700 mb-2">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Barbara"
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          required
        />
      </div>

      {/* Nickname */}
      <div>
        <label htmlFor="nickname" className="block text-lg font-semibold text-gray-700 mb-2">
          Nickname (optional)
        </label>
        <input
          type="text"
          id="nickname"
          name="nickname"
          value={formData.nickname}
          onChange={handleChange}
          placeholder="e.g., Barb, Mom"
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        />
        <p className="text-sm text-gray-500 mt-1">What do you usually call them?</p>
      </div>

      {/* Relationship */}
      <div>
        <label htmlFor="relationship" className="block text-lg font-semibold text-gray-700 mb-2">
          Relationship <span className="text-red-500">*</span>
        </label>
        <select
          id="relationship"
          name="relationship"
          value={formData.relationship}
          onChange={handleChange}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          required
        >
          <option value="">Select relationship...</option>
          {RELATIONSHIP_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-lg font-semibold text-gray-700 mb-2">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-lg font-semibold text-gray-700 mb-2">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., My wife of 42 years"
          rows={2}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
        />
        <p className="text-sm text-gray-500 mt-1">A brief description to help you remember</p>
      </div>

      {/* Association */}
      <div>
        <label htmlFor="association" className="block text-lg font-semibold text-gray-700 mb-2">
          What do you associate with them? (optional)
        </label>
        <textarea
          id="association"
          name="association"
          value={formData.association}
          onChange={handleChange}
          placeholder="e.g., Makes the best apple pie"
          rows={2}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
        />
        <p className="text-sm text-gray-500 mt-1">A memory or trait that helps you remember them</p>
      </div>

      {/* Location Context */}
      <div>
        <label htmlFor="location_context" className="block text-lg font-semibold text-gray-700 mb-2">
          Where do you usually see them? (optional)
        </label>
        <input
          type="text"
          id="location_context"
          name="location_context"
          value={formData.location_context}
          onChange={handleChange}
          placeholder="e.g., Lives with me, Visits on Sundays"
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
