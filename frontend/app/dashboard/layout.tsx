'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="text-3xl font-bold text-[var(--color-primary)]">
                Parrot Software
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <span className="text-lg text-gray-700">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-md p-6 sticky top-24" aria-label="Main navigation">
              <h2 className="text-xl font-bold mb-6 text-gray-900">
                Treatment Apps
              </h2>

              <ul className="space-y-3">
                <li>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--color-primary)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    🏠 Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/treatments/word-finding"
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--color-primary)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    📝 Word Finding
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/treatments/life-words"
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--color-primary)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    👤 Life Words and Memory
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/treatments/short-term-memory"
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--color-primary)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                    
                  >
                    🧠 Short Term Memory
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/progress"
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--color-primary)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    📊 My Progress
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--color-primary)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    👤 User
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
