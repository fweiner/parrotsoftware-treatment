'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface LifeWordsStatus {
  contact_count: number
  can_start_session: boolean
  min_contacts_required: number
}

export default function LifeWordsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<LifeWordsStatus | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Please log in to continue')
        setIsLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load status')
      }

      const data = await response.json()
      setStatus(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Error loading status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartSession = async () => {
    setIsStarting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Please log in to start a session')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        let errorMessage = 'Failed to create session'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const sessionData = await response.json()
      router.push(`/dashboard/treatments/life-words/session/${sessionData.session.id}`)

    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Error creating session:', err)
    } finally {
      setIsStarting(false)
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

  const needsSetup = !status?.can_start_session

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-primary)]">
          Find My Life Words
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Practice naming the people, pets, and things that matter most to you.
        </p>

        {needsSetup ? (
          // Setup flow - user needs to add contacts first
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 mb-6">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Let's Get Started!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Before you can practice, we need to add some photos of the people and things in your life.
              You'll need at least {status?.min_contacts_required || 2} contacts to start a session.
            </p>

            {status && status.contact_count > 0 && (
              <p className="text-lg text-amber-700 mb-6">
                You currently have {status.contact_count} contact{status.contact_count !== 1 ? 's' : ''}.
                Add {(status.min_contacts_required || 2) - status.contact_count} more to begin!
              </p>
            )}

            <div className="bg-white rounded-lg p-6 mb-6 text-left">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                What you'll add:
              </h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">1.</span>
                  <span>A clear photo of the person or item</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">2.</span>
                  <span>Their name and any nicknames you use</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">3.</span>
                  <span>Your relationship (wife, grandson, friend, pet, etc.)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">4.</span>
                  <span>Optional: A description or association to help you remember</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href="/dashboard/treatments/life-words/setup"
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2 inline-block"
                style={{ minHeight: '44px' }}
              >
                Get Started
              </Link>
            </div>
          </div>
        ) : (
          // Ready to practice - user has enough contacts
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 mb-6">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Ready to Practice!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              You have {status?.contact_count} contact{status?.contact_count !== 1 ? 's' : ''} ready.
              Start a session to practice naming them!
            </p>

            <div className="bg-white rounded-lg p-6 mb-6 text-left">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                How it works:
              </h3>
              <ul className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">1.</span>
                  <span>You'll see photos of your people and things</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">2.</span>
                  <span>Try to name who or what you see within 30 seconds</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">3.</span>
                  <span>If you need help, personalized cues are available</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-primary)] mr-3 text-2xl">4.</span>
                  <span>Your progress is tracked automatically</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-lg font-semibold">Error: {error}</p>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStartSession}
                disabled={isStarting}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-gray-400 text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                {isStarting ? 'Starting...' : 'Start Practice Session'}
              </button>

              <Link
                href="/dashboard/treatments/life-words/contacts"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-6 px-8 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-offset-2 inline-block text-center"
                style={{ minHeight: '44px' }}
              >
                Manage Contacts
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="inline-block text-[var(--color-primary)] hover:underline text-lg"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mt-6">
          <h3 className="text-2xl font-bold mb-3 text-gray-900">
            Why personalized practice?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-gray-700">
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Practice with familiar faces and items</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Personalized cues based on your relationships</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>More meaningful and motivating practice</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Progress tracking for each person/item</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
