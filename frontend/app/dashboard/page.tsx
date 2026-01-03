'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalSessions: 0,
    recentActivity: [] as any[]
  })
  const supabase = createClient()

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch user stats from backend
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/results/my-progress`, {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          })
          if (response.ok) {
            const progress = await response.json()
            const total = progress.reduce((sum: number, p: any) => sum + p.total_sessions, 0)
            setStats({ totalSessions: total, recentActivity: progress })
          }
        } catch (error) {
          console.error('Failed to load stats:', error)
        }
      }
    }

    loadUserData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-primary)]">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
        </h1>
        <p className="text-xl text-gray-700">
          Ready to continue your cognitive therapy journey?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[var(--color-primary)]">
          <div className="text-5xl mb-2">📊</div>
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {stats.totalSessions}
          </div>
          <div className="text-lg text-gray-600">Total Sessions</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[var(--color-accent)]">
          <div className="text-5xl mb-2">🎯</div>
          <div className="text-3xl font-bold text-[var(--color-accent)]">
            {stats.recentActivity.length}
          </div>
          <div className="text-lg text-gray-600">Activities Tried</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[var(--color-success)]">
          <div className="text-5xl mb-2">⭐</div>
          <div className="text-3xl font-bold text-[var(--color-success)]">
            Keep Going!
          </div>
          <div className="text-lg text-gray-600">You're doing great</div>
        </div>
      </div>

      {/* Available Treatments */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Available Treatments</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Word Finding - Active */}
          <Link
            href="/dashboard/treatments/word-finding"
            className="block p-6 border-2 border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <div className="flex items-start space-x-4">
              <div className="text-5xl">📝</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
                  Word Finding
                </h3>
                <p className="text-lg text-gray-700 mb-3">
                  Use semantic cues to help recall and name objects shown in images.
                </p>
                <span className="inline-block bg-[var(--color-primary)] text-white px-4 py-2 rounded-full text-base font-semibold">
                  Start Now →
                </span>
              </div>
            </div>
          </Link>

          {/* My Life Words and Memory - Active */}
          <Link
            href="/dashboard/treatments/life-words"
            className="block p-6 border-2 border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <div className="flex items-start space-x-4">
              <div className="text-5xl">👤</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
                  My Life Words and Memory
                </h3>
                <p className="text-lg text-gray-700 mb-3">
                  Practice naming the people, pets, and things that matter most to you.
                </p>
                <span className="inline-block bg-[var(--color-primary)] text-white px-4 py-2 rounded-full text-base font-semibold">
                  Start Now →
                </span>
              </div>
            </div>
          </Link>

          {/* Short Term Memory - Active */}
          <Link
            href="/dashboard/treatments/short-term-memory"
            className="block p-6 border-2 border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <div className="flex items-start space-x-4">
              <div className="text-5xl">🧠</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
                  Short Term Memory
                </h3>
                <p className="text-lg text-gray-700 mb-3">
                  Practice remembering grocery lists with adjustable difficulty.
                </p>
                <span className="inline-block bg-[var(--color-primary)] text-white px-4 py-2 rounded-full text-base font-semibold">
                  Start Now
                </span>
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard/treatments/life-words"
            className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold py-4 px-6 rounded-lg text-xl text-center transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            style={{ minHeight: '44px' }}
          >
            👤 Start Life Words and Memory
          </Link>

          <Link
            href="/dashboard/progress"
            className="flex-1 bg-[var(--color-accent)] hover:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg text-xl text-center transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-2"
            style={{ minHeight: '44px' }}
          >
            📊 View Progress
          </Link>
        </div>
      </div>
    </div>
  )
}
