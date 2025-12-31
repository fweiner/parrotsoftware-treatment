'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface UnreadBadgeProps {
  className?: string
}

export function UnreadBadge({ className = '' }: UnreadBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadUnreadCount()
    // Poll for new messages every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/life-words/messaging/unread-count`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  if (unreadCount === 0) return null

  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full ${className}`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
