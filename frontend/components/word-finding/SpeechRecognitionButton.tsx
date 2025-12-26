'use client'

import { useEffect } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { extractAnswer } from '@/lib/matching/answerMatcher'

interface SpeechRecognitionButtonProps {
  onResult: (transcript: string) => void
  disabled?: boolean
  resetTrigger?: number // Increment this to force reset
  timer?: number // Timer value for better disabled message
  isCorrectAnswer?: boolean // Indicates if this is a correct answer (vs timer expired)
  onStartListening?: () => void // Callback when user starts listening
  autoStart?: boolean // Auto-start listening when component mounts
}

export default function SpeechRecognitionButton({
  onResult,
  disabled = false,
  resetTrigger = 0,
  timer,
  isCorrectAnswer = false,
  onStartListening,
  autoStart = false,
}: SpeechRecognitionButtonProps) {
  const { isListening, isSupported, error, start, stop, transcript, abort } =
    useSpeechRecognition({
      continuous: true, // Keep listening until we manually stop
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          const answer = extractAnswer(transcript)
          onResult(answer)
          // Stop recognition after getting final result
          stop()
        }
      },
      onError: (error) => {
        console.error('Speech recognition error:', error)
      },
    })

  // Auto-start listening when component mounts if autoStart is true
  useEffect(() => {
    if (autoStart && isSupported && !disabled) {
      console.log('Auto-starting speech recognition')
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        onStartListening?.()
        start()
      }, 500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isSupported])

  // Reset when resetTrigger changes (e.g., new image, timeout)
  useEffect(() => {
    if (isListening) {
      console.log('Resetting speech recognition due to resetTrigger change')
      abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]) // Only depend on resetTrigger to avoid infinite loops

  const handleClick = () => {
    console.log('Button clicked', { isListening, disabled })
    if (isListening) {
      console.log('Stopping recognition')
      stop()
    } else {
      console.log('Starting recognition')
      // Call onStartListening callback before starting (for first image prompt)
      onStartListening?.()
      start()
    }
  }

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center max-w-2xl">
        <p className="text-xl text-yellow-800 mb-2">Speech recognition is not supported in this browser.</p>
        <p className="text-lg text-yellow-700">Please use Chrome or Edge for the best experience.</p>
      </div>
    )
  }

  return (
    <div className="text-center w-full max-w-2xl">
      {disabled && !isListening && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4" role="alert">
          <p className="text-xl text-blue-800">
            {timer !== undefined && timer === 0
              ? (isCorrectAnswer
                  ? 'Correct! Wait for the next image.'
                  : 'Time expired. Please wait for the next image.')
              : 'Processing answer...'}
          </p>
        </div>
      )}

      {isListening ? (
        <div className="w-full py-8 px-12 rounded-lg text-2xl font-bold bg-green-100 border-4 border-green-500 mb-4" style={{ minHeight: '80px' }}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="animate-pulse">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="4" cy="10" r="2" />
                <circle cx="10" cy="10" r="2" />
                <circle cx="16" cy="10" r="2" />
              </svg>
            </div>
            <span className="text-green-800">🎤 Listening...</span>
          </div>
          <p className="text-xl text-green-700 font-normal">Say the object's name now</p>
          <button
            type="button"
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg text-lg transition-colors"
            onClick={handleClick}
          >
            Stop Listening
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full py-8 px-12 rounded-lg text-2xl font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-offset-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white focus:ring-[var(--color-primary)]"
          onClick={handleClick}
          disabled={disabled}
          style={{ minHeight: '80px' }}
          aria-label="Click and say the object's name"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">🎤</span>
            <span>Click to start (or restart) listening</span>
          </div>
        </button>
      )}

      {transcript && (
        <div className="mt-6 bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <p className="text-gray-600 text-lg mb-2">You said:</p>
          <p className="text-2xl font-bold text-gray-900">{transcript}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-lg p-4" role="alert">
          <p className="text-red-700 text-xl font-semibold">{error}</p>
        </div>
      )}
    </div>
  )
}
