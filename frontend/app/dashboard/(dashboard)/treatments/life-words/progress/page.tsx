'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface ProgressSummary {
  total_sessions: number
  name_practice: {
    sessions: number
    correct: number
    total: number
    accuracy: number
  }
  question_practice: {
    sessions: number
    correct: number
    total: number
    accuracy: number
  }
}

interface SessionHistory {
  type: 'name' | 'question'
  date: string
  total_correct: number
  total_incorrect?: number
  total_questions?: number
  accuracy: number
}

export default function LifeWordsProgressPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([])

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/life-words/progress`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load progress')
      }

      const data = await response.json()
      setSummary(data.summary)
      setSessionHistory(data.session_history || [])
    } catch (err: any) {
      console.error('Error loading progress:', err)
      setError(err?.message || 'Failed to load progress')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Loading progress...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8">
          <h4 className="text-2xl font-bold text-red-900 mb-4">Error</h4>
          <p className="text-xl text-red-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/treatments/life-words')}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 px-6 rounded-lg text-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const overallAccuracy = summary
    ? Math.round(
        ((summary.name_practice.correct + summary.question_practice.correct) /
          Math.max(1, summary.name_practice.total + summary.question_practice.total)) *
          100
      )
    : 0

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/treatments/life-words"
          className="text-[var(--color-primary)] hover:underline text-lg"
        >
          &larr; Back to Life Words and Memory
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-gray-900">Your Progress</h1>

      {summary && summary.total_sessions === 0 ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Sessions Yet</h2>
          <p className="text-lg text-gray-700 mb-6">
            Complete some practice sessions to see your progress here!
          </p>
          <Link
            href="/dashboard/treatments/life-words"
            className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 px-8 rounded-lg text-lg"
          >
            Start Practicing
          </Link>
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Overall Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {summary?.total_sessions || 0}
                </div>
                <div className="text-gray-600">Total Sessions</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-green-600">
                  {overallAccuracy}%
                </div>
                <div className="text-gray-600">Overall Accuracy</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-purple-600">
                  {(summary?.name_practice.correct || 0) + (summary?.question_practice.correct || 0)}
                </div>
                <div className="text-gray-600">Correct Answers</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-amber-600">
                  {(summary?.name_practice.total || 0) + (summary?.question_practice.total || 0)}
                </div>
                <div className="text-gray-600">Total Attempts</div>
              </div>
            </div>
          </div>

          {/* Practice Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Name Practice */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center">
                <span className="text-2xl mr-2">👤</span>
                Name Practice
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sessions Completed</span>
                  <span className="font-bold text-lg">{summary?.name_practice.sessions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Correct Answers</span>
                  <span className="font-bold text-lg text-green-600">
                    {summary?.name_practice.correct || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Attempts</span>
                  <span className="font-bold text-lg">{summary?.name_practice.total || 0}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Accuracy</span>
                    <span className="font-bold text-xl text-blue-600">
                      {summary?.name_practice.accuracy || 0}%
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${summary?.name_practice.accuracy || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Question Practice */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center">
                <span className="text-2xl mr-2">❓</span>
                Question Practice
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sessions Completed</span>
                  <span className="font-bold text-lg">{summary?.question_practice.sessions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Correct Answers</span>
                  <span className="font-bold text-lg text-green-600">
                    {summary?.question_practice.correct || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Questions</span>
                  <span className="font-bold text-lg">{summary?.question_practice.total || 0}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Accuracy</span>
                    <span className="font-bold text-xl text-purple-600">
                      {summary?.question_practice.accuracy || 0}%
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${summary?.question_practice.accuracy || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Session History */}
          {sessionHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Recent Sessions</h3>
              <div className="space-y-3">
                {sessionHistory.map((session, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {session.type === 'name' ? '👤' : '❓'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.type === 'name' ? 'Name Practice' : 'Question Practice'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(session.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        session.accuracy >= 80 ? 'text-green-600' :
                        session.accuracy >= 50 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {session.accuracy}%
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.total_correct} correct
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
