'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface Progress {
  total_sessions: number
  total_trials: number
  total_items_correct: number
  average_accuracy: number
  max_list_length: number
}

interface Session {
  id: string
  list_length: number
  started_at: string
  completed_at: string | null
  total_correct: number
  total_trials: number
}

export default function ShortTermMemoryPage() {
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [listLength, setListLength] = useState(3)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(apiUrl + '/api/short-term-memory/sessions', {
        headers: {
          'Authorization': 'Bearer ' + session.access_token
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProgress(data.progress)
        setRecentSessions(data.sessions.slice(0, 5))

        if (data.progress.total_sessions === 0) {
          setShowOnboarding(true)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startSession = async () => {
    setStarting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(apiUrl + '/api/short-term-memory/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ list_length: listLength })
      })

      if (response.ok) {
        const newSession = await response.json()
        router.push('/dashboard/treatments/short-term-memory/session/' + newSession.id)
      }
    } catch (error) {
      console.error('Error starting session:', error)
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-5xl">🧠</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Short-Term Memory</h1>
            <p className="text-xl text-gray-600">Practice remembering grocery lists</p>
          </div>
        </div>
        <p className="text-lg text-gray-700">
          Listen to a list of grocery items, wait 30 seconds, then recall as many as you can.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Start a Session</h2>
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-3">
            How many items per list?
          </label>
          <div className="flex gap-3">
            {[2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setListLength(num)}
                className={'px-6 py-4 text-xl font-bold rounded-lg border-2 transition-colors ' +
                  (listLength === num
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-[var(--color-primary)]')
                }
              >
                {num} items
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={startSession}
          disabled={starting}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors disabled:opacity-50"
        >
          {starting ? 'Starting...' : 'Start Practice Session'}
        </button>
      </div>

      {progress && progress.total_sessions > 0 && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Your Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--color-primary)]">{progress.total_sessions}</div>
              <div className="text-gray-600">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--color-primary)]">{Math.round(progress.average_accuracy)}%</div>
              <div className="text-gray-600">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--color-primary)]">{progress.total_items_correct}</div>
              <div className="text-gray-600">Items Correct</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--color-primary)]">{progress.max_list_length}</div>
              <div className="text-gray-600">Max List Size</div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <Link href="/dashboard" className="text-[var(--color-primary)] hover:underline text-lg">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
      {step === 0 && (
        <>
          <h2 className="text-3xl font-bold mb-6">Welcome!</h2>
          <p className="text-lg mb-4">This app helps you practice remembering grocery lists.</p>
          <ul className="list-disc list-inside space-y-2 text-lg mb-8">
            <li>You will hear a grocery list spoken aloud</li>
            <li>Wait 30 seconds while you remember it</li>
            <li>Speak the items you remember</li>
            <li>Get feedback on how you did</li>
          </ul>
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="text-3xl font-bold mb-6">Example</h2>
          <p className="text-lg mb-4">Listen to this list:</p>
          <p className="text-2xl font-bold my-6">Apples, milk, bread</p>
          <button
            onClick={() => speakText('Apples, milk, bread')}
            className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg text-lg mb-8"
          >
            Play Example
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="text-3xl font-bold mb-6">Ready to Start!</h2>
          <p className="text-lg mb-8">
            Choose a difficulty level and start practicing. Remember: this is a practice tool, not a test.
          </p>
        </>
      )}
      <div className="flex justify-between">
        <button onClick={onComplete} className="text-gray-600 hover:text-gray-800">
          Skip Tutorial
        </button>
        <button
          onClick={handleNext}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          {step < 2 ? 'Next' : 'Get Started'}
        </button>
      </div>
      <div className="mt-4 text-center text-gray-500">
        Step {step + 1} of 3
      </div>
    </div>
  )
}
