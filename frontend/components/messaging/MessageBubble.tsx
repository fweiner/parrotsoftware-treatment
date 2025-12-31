'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'

interface MessageBubbleProps {
  message: {
    id: string
    direction: string
    text_content: string | null
    photo_url: string | null
    voice_url: string | null
    voice_duration_seconds: number | null
    created_at: string
  }
  isOwnMessage: boolean
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const progress = message.voice_duration_seconds
    ? (currentTime / message.voice_duration_seconds) * 100
    : 0

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[70%] rounded-2xl p-3 ${
          isOwnMessage
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {/* Photo */}
        {message.photo_url && (
          <div className="relative w-full max-w-[300px] aspect-square rounded-lg overflow-hidden mb-2">
            <Image
              src={message.photo_url}
              alt="Photo message"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Voice */}
        {message.voice_url && (
          <div className="flex items-center gap-3 mb-2 min-w-[200px]">
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isOwnMessage ? 'bg-blue-400 hover:bg-blue-300' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <div className="flex-1">
              <div className={`h-1 rounded-full ${isOwnMessage ? 'bg-blue-300' : 'bg-gray-300'}`}>
                <div
                  className={`h-full rounded-full transition-all ${isOwnMessage ? 'bg-white' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {message.voice_duration_seconds && (
                <span className={`text-xs mt-1 block ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                  {isPlaying ? formatDuration(Math.floor(currentTime)) : formatDuration(message.voice_duration_seconds)}
                </span>
              )}
            </div>
            <audio
              ref={audioRef}
              src={message.voice_url}
              onEnded={() => {
                setIsPlaying(false)
                setCurrentTime(0)
              }}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        )}

        {/* Text */}
        {message.text_content && (
          <p className="text-base whitespace-pre-wrap break-words">
            {message.text_content}
          </p>
        )}

        {/* Timestamp */}
        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
