'use client'

import { MessageBubble } from './MessageBubble'

interface Message {
  id: string
  direction: string
  text_content: string | null
  photo_url: string | null
  voice_url: string | null
  voice_duration_seconds: number | null
  created_at: string
}

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  userPerspective?: boolean // true = user viewing, false = contact viewing
}

export function MessageList({ messages, isLoading = false, userPerspective = true }: MessageListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-lg">No messages yet</p>
        <p className="text-sm">Start the conversation!</p>
      </div>
    )
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ''

  messages.forEach(msg => {
    const msgDate = new Date(msg.created_at).toLocaleDateString()
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msgDate, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  })

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="space-y-4">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Date header */}
          <div className="flex justify-center mb-4">
            <span className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded-full">
              {formatDateHeader(group.date)}
            </span>
          </div>
          {/* Messages for this date */}
          {group.messages.map(message => {
            // Determine if this is the user's own message
            // From user perspective: user_to_contact = own message
            // From contact perspective: contact_to_user = own message
            const isOwnMessage = userPerspective
              ? message.direction === 'user_to_contact'
              : message.direction === 'contact_to_user'

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={isOwnMessage}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
