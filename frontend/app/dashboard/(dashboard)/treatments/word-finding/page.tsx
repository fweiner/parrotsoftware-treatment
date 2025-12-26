'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function WordFindingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleStartSession = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Please log in to start a session')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/word-finding/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = 'Failed to create session'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || JSON.stringify(errorData) || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const sessionData = await response.json()
      console.log('Session created:', sessionData)

      // Navigate to session page
      router.push(`/dashboard/treatments/word-finding/session/${sessionData.session.id}`)

    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Error creating session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-primary)]">
          📝 Word Finding Practice
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Use semantic cues to help recall and name objects shown in images.
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-6">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Ready to Practice Word Finding?
          </h2>
          <p className="text-lg text-gray-700 mb-6">
            In each session, you'll see 10 images. Try to name each object, and use the hierarchical cue system if you need help.
          </p>

          <div className="bg-white rounded-lg p-6 mb-6 text-left">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">
              How it works:
            </h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] mr-3 text-2xl">1.</span>
                <span>You'll see a random image of an everyday object</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] mr-3 text-2xl">2.</span>
                <span>Try to name the object within 30 seconds</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] mr-3 text-2xl">3.</span>
                <span>If you need help, progressive cues are available (first letter, category, features, etc.)</span>
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

          <div className="mt-8 flex gap-4 justify-center">
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-gray-400 text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              style={{ minHeight: '44px' }}
            >
              {isLoading ? 'Starting...' : '🎯 Start New Session'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/dashboard"
              className="inline-block text-[var(--color-primary)] hover:underline text-lg"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-3 text-gray-900">
            📊 Features:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-gray-700">
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>60 unique stimuli images</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>8-level hierarchical cue system</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Randomized selection each session</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Progress tracking & statistics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
