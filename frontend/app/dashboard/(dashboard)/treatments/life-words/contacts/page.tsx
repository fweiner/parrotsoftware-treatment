'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ContactCard, Contact } from '@/components/life-words/ContactCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ContactsListPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Please log in to continue')
        setIsLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/contacts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load contacts')
      }

      const data = await response.json()
      setContacts(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Error loading contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Please log in to continue')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }

      setContacts(prev => prev.filter(c => c.id !== contactId))
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Your Contacts
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link
            href="/dashboard/treatments/life-words"
            className="text-[var(--color-primary)] hover:underline"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Add new contact button */}
        <Link
          href="/dashboard/treatments/life-words/contacts/new"
          className="w-full py-4 px-6 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 font-semibold text-lg transition-colors mb-6 block text-center"
        >
          + Add New Contact
        </Link>

        {/* Contacts grid */}
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDelete={handleDeleteContact}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">👤</div>
            <p className="text-xl text-gray-600 mb-4">No contacts yet</p>
            <p className="text-gray-500">Add your first contact to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
