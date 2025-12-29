'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import SpeechRecognitionButton from '@/components/word-finding/SpeechRecognitionButton'
import { PersonalizedCueSystem } from '@/components/life-words/PersonalizedCueSystem'
import { speak, waitForVoices } from '@/lib/utils/textToSpeech'
import { getRandomPositiveFeedback } from '@/lib/utils/positiveFeedback'

interface PersonalContact {
  id: string
  name: string
  nickname?: string
  relationship: string
  photo_url: string
  first_letter?: string
  category?: string
  description?: string
  association?: string
  location_context?: string
}

interface Session {
  id: string
  user_id: string
  contact_ids: string[]
  started_at: string
  is_completed: boolean
}

// Check if the answer matches the contact name or nickname
function matchPersonalAnswer(answer: string, contact: PersonalContact): boolean {
  const normalizedAnswer = answer.toLowerCase().trim()
  const normalizedName = contact.name.toLowerCase().trim()
  const normalizedNickname = contact.nickname?.toLowerCase().trim()

  // Exact match
  if (normalizedAnswer === normalizedName) return true
  if (normalizedNickname && normalizedAnswer === normalizedNickname) return true

  // Contains match (for multi-word answers)
  if (normalizedAnswer.includes(normalizedName)) return true
  if (normalizedNickname && normalizedAnswer.includes(normalizedNickname)) return true

  // First name match (if full name provided)
  const firstName = normalizedName.split(' ')[0]
  if (normalizedAnswer === firstName) return true

  return false
}

export default function LifeWordsSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [session, setSession] = useState<Session | null>(null)
  const [contacts, setContacts] = useState<PersonalContact[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentContact, setCurrentContact] = useState<PersonalContact | null>(null)
  const [cuesUsed, setCuesUsed] = useState(0)
  const [isAnswering, setIsAnswering] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false)
  const [hasSpokenFirstPrompt, setHasSpokenFirstPrompt] = useState(false)
  const [isWaitingForNext, setIsWaitingForNext] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const isProcessingAnswerRef = useRef(false)
  const currentContactRef = useRef<PersonalContact | null>(null)
  const currentIndexRef = useRef(0)
  const hasSpokenFirstPromptRef = useRef(false)

  // Initialize session
  useEffect(() => {
    initializeSession()
  }, [])

  const initializeSession = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load session')
      }

      const sessionData = await response.json()
      setSession(sessionData.session as Session)
      setContacts(sessionData.contacts as PersonalContact[])

      const firstContact = sessionData.contacts[0]
      setCurrentIndex(0)
      currentIndexRef.current = 0
      setCurrentContact(firstContact)
      currentContactRef.current = firstContact
      setIsAnswering(true)

      hasSpokenFirstPromptRef.current = false
      setHasSpokenFirstPrompt(false)

      setLoading(false)

    } catch (err: any) {
      console.error('Session initialization error:', err)
      setError(`Failed to initialize session: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  const handleAnswer = async (transcript: string) => {
    const currentCont = currentContactRef.current
    const isProcessing = isProcessingAnswerRef.current

    if (!currentCont || !session || isProcessing) {
      return
    }

    setIsProcessingAnswer(true)
    isProcessingAnswerRef.current = true

    try {
      const isCorrect = matchPersonalAnswer(transcript, currentCont)

      if (isCorrect) {
        await handleCorrectAnswer(transcript)
      } else {
        // Answer is incorrect - offer a hint
        setIsProcessingAnswer(false)
        isProcessingAnswerRef.current = false
        setCuesUsed(0)
        setIsAnswering(false)
      }
    } catch (err) {
      console.error('Error handling answer:', err)
      setIsProcessingAnswer(false)
      isProcessingAnswerRef.current = false
    }
  }

  const handleCorrectAnswer = async (userAnswer: string) => {
    const currentCont = currentContactRef.current
    if (!currentCont || !session) {
      setIsProcessingAnswer(false)
      isProcessingAnswerRef.current = false
      return
    }

    setIsAnswering(false)
    setIsWaitingForNext(true)
    setShowSuccess(true)

    await saveResponse(true, userAnswer)

    try {
      const feedbackMessage = getRandomPositiveFeedback()
      await speak(feedbackMessage)
    } catch (speakError: any) {
      console.warn('Text-to-speech failed:', speakError?.message || speakError)
    }

    setTimeout(async () => {
      setShowSuccess(false)
      await moveToNext()
    }, 2000)
  }

  const handleCueAnswer = async (userAnswer: string, isCorrect: boolean) => {
    if (!currentContact || !session) return

    if (isCorrect) {
      await saveResponse(true, userAnswer, cuesUsed + 1)
      try {
        const feedbackMessage = getRandomPositiveFeedback()
        await speak(feedbackMessage)
      } catch (speakError: any) {
        console.warn('Text-to-speech failed:', speakError?.message || speakError)
      }
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        moveToNext()
      }, 2000)
    } else {
      setCuesUsed((prev) => prev + 1)
    }
  }

  const handleFinalAnswer = async () => {
    if (!currentContact || !session) return

    await saveResponse(false, null, 7)
    moveToNext()
  }

  const saveResponse = async (isCorrect: boolean, userAnswer: string | null, cuesUsedOverride?: number) => {
    const currentCont = currentContactRef.current
    if (!currentCont || !session) return

    const actualCuesUsed = cuesUsedOverride !== undefined ? cuesUsedOverride : cuesUsed

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/sessions/${session.id}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact_id: currentCont.id,
          is_correct: isCorrect,
          cues_used: actualCuesUsed,
          response_time: 0,
          user_answer: userAnswer,
          correct_answer: currentCont.name,
        })
      })
    } catch (error) {
      console.error('Error saving response:', error)
    }
  }

  const moveToNext = async () => {
    const currentIdx = currentIndexRef.current
    const nextIndex = currentIdx + 1

    if (nextIndex >= contacts.length) {
      completeSession()
      return
    }

    const nextContact = contacts[nextIndex]

    currentIndexRef.current = nextIndex
    currentContactRef.current = nextContact
    isProcessingAnswerRef.current = false

    setCurrentIndex(nextIndex)
    setCurrentContact(nextContact)
    setCuesUsed(0)
    setIsAnswering(true)
    setIsProcessingAnswer(false)
    setIsWaitingForNext(false)

    try {
      await speak(`The person in this picture is...`)
    } catch (speakError: any) {
      console.warn('Text-to-speech failed:', speakError?.message || speakError)
    }
  }

  const completeSession = async () => {
    if (!session) return

    setIsCompleted(true)
    setIsAnswering(false)

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/sessions/${session.id}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
        }
      })
    } catch (error) {
      console.error('Error completing session:', error)
    }
  }

  const handleDone = () => {
    router.push('/dashboard/treatments/life-words')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Starting session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8 max-w-2xl">
          <h4 className="text-2xl font-bold text-red-900 mb-4">Error</h4>
          <p className="text-xl text-red-700 mb-6">{error}</p>
          <button
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl"
            onClick={() => router.push('/dashboard/treatments/life-words')}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-green-600 mb-4">Great job!</h2>
          <p className="text-xl text-gray-700 mb-8">
            You practiced with all your contacts today.
          </p>
          <button
            onClick={handleDone}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Progress indicator - simple dots */}
      <div className="flex gap-2 mb-8">
        {contacts.map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx < currentIndex
                ? 'bg-green-500'
                : idx === currentIndex
                ? 'bg-[var(--color-primary)]'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {currentContact && (
        <>
          {/* Photo display */}
          <div className={`relative w-80 h-80 md:w-96 md:h-96 rounded-lg overflow-hidden shadow-lg mb-8 transition-all duration-300 ${showSuccess ? 'ring-8 ring-green-500' : 'border-4 border-gray-200'}`}>
            <Image
              src={currentContact.photo_url}
              alt="Who is this?"
              fill
              className="object-cover"
              onLoad={() => {
                if (currentIndex === 0 && !hasSpokenFirstPromptRef.current) {
                  setTimeout(async () => {
                    if (!hasSpokenFirstPromptRef.current) {
                      try {
                        await waitForVoices()
                        await speak(`The person in this picture is...`)
                        hasSpokenFirstPromptRef.current = true
                        setHasSpokenFirstPrompt(true)
                      } catch (error: any) {
                        console.log('TTS blocked by browser:', error?.message || error)
                      }
                    }
                  }, 300)
                }
              }}
            />
            {showSuccess && (
              <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                <span className="text-8xl">✓</span>
              </div>
            )}
          </div>

          {/* Prompt text */}
          <p className="text-2xl text-gray-700 mb-6 text-center">
            The person in this picture is...
          </p>

          {isWaitingForNext && !isAnswering ? (
            <div className="text-center">
              <p className="text-xl text-green-700">Moving to next person...</p>
            </div>
          ) : isAnswering ? (
            <SpeechRecognitionButton
              key={`speech-${currentIndex}`}
              onResult={handleAnswer}
              disabled={isProcessingAnswer}
              resetTrigger={currentIndex}
              autoStart={true}
              onStartListening={async () => {
                if (currentIndex === 0 && !hasSpokenFirstPromptRef.current) {
                  try {
                    await waitForVoices()
                    await speak(`The person in this picture is...`)
                    hasSpokenFirstPromptRef.current = true
                    setHasSpokenFirstPrompt(true)
                  } catch (error: any) {
                    console.warn('Failed to speak prompt:', error)
                  }
                }
              }}
            />
          ) : (
            <PersonalizedCueSystem
              contact={currentContact}
              cuesUsed={cuesUsed}
              onAnswer={handleCueAnswer}
              onFinalAnswer={handleFinalAnswer}
              onContinue={() => {
                setIsAnswering(true)
              }}
            />
          )}

          {/* Done button - always visible */}
          <div className="mt-12">
            <button
              onClick={handleDone}
              className="text-gray-500 hover:text-gray-700 underline text-lg"
            >
              Done for now
            </button>
          </div>
        </>
      )}
    </div>
  )
}
