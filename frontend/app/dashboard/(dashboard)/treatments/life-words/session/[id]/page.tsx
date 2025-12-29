'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import SpeechRecognitionButton from '@/components/word-finding/SpeechRecognitionButton'
import { PersonalizedCueSystem } from '@/components/life-words/PersonalizedCueSystem'
import Timer from '@/components/word-finding/Timer'
import SessionProgress from '@/components/word-finding/SessionProgress'
import { speak, waitForVoices } from '@/lib/utils/textToSpeech'
import { getRandomPositiveFeedback } from '@/lib/utils/positiveFeedback'

const TIMER_DURATION = 30 // seconds

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

interface SessionResponse {
  id: string
  session_id: string
  contact_id: string
  is_correct: boolean
  cues_used: number
  response_time: number
  user_answer: string | null
  correct_answer: string
  completed_at: string
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
  const [timer, setTimer] = useState(TIMER_DURATION)
  const [responses, setResponses] = useState<SessionResponse[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false)
  const [hasSpokenFirstPrompt, setHasSpokenFirstPrompt] = useState(false)
  const [isWaitingForNext, setIsWaitingForNext] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)

  const isProcessingAnswerRef = useRef(false)
  const currentContactRef = useRef<PersonalContact | null>(null)
  const currentIndexRef = useRef(0)
  const hasSpokenFirstPromptRef = useRef(false)

  // Initialize session
  useEffect(() => {
    initializeSession()
  }, [])

  // Timer countdown
  const handleTimeoutRef = useRef<(() => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    handleTimeoutRef.current = handleTimeout
  }, [cuesUsed, isAnswering, currentContact, session])

  useEffect(() => {
    const isInCueSystem = !isAnswering && currentContact !== null
    const shouldRunTimer = (isAnswering || isInCueSystem) && timer > 0 && !isCompleted
    if (!shouldRunTimer) return

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleTimeoutRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isAnswering, currentContact, timer, isCompleted])

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
      setTimer(TIMER_DURATION)

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
        // Answer is incorrect - trigger cue system
        setIsProcessingAnswer(false)
        isProcessingAnswerRef.current = false
        setCuesUsed(0)
        setIsAnswering(false)
        setTimer(TIMER_DURATION)
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

    setTimer(0)
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

  const handleTimeout = async () => {
    if (!currentContact || !session) return

    if (isAnswering && cuesUsed === 0) {
      setCuesUsed(0)
      setIsAnswering(false)
      setTimeout(() => {
        setTimer(TIMER_DURATION)
      }, 0)
    } else if (!isAnswering && cuesUsed < 7) {
      const nextCuesUsed = cuesUsed + 1
      setCuesUsed(nextCuesUsed)
      setIsAnswering(false)
      setTimeout(() => {
        setTimer(TIMER_DURATION)
      }, 50)
    } else {
      await saveResponse(false, null)
      try {
        await speak(`This is ${currentContact.name}`)
      } catch (speakError: any) {
        console.warn('Text-to-speech failed:', speakError?.message || speakError)
      }
      moveToNext()
    }
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
      moveToNext()
    } else {
      setCuesUsed((prev) => prev + 1)
      setTimer(TIMER_DURATION)
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

    const responseTime = TIMER_DURATION - timer
    const actualCuesUsed = cuesUsedOverride !== undefined ? cuesUsedOverride : cuesUsed

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/sessions/${session.id}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact_id: currentCont.id,
          is_correct: isCorrect,
          cues_used: actualCuesUsed,
          response_time: responseTime,
          user_answer: userAnswer,
          correct_answer: currentCont.name,
        })
      })

      if (!response.ok) {
        console.error('Failed to save response')
      }

      const newResponse: SessionResponse = {
        id: '',
        session_id: session.id,
        contact_id: currentCont.id,
        is_correct: isCorrect,
        cues_used: actualCuesUsed,
        response_time: responseTime,
        user_answer: userAnswer,
        correct_answer: currentCont.name,
        completed_at: new Date().toISOString(),
      }

      setResponses((prev) => [...prev, newResponse])
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
    setTimer(TIMER_DURATION)
    setIsProcessingAnswer(false)
    setIsWaitingForNext(false)

    try {
      await speak(`Who do you see in this picture?`)
    } catch (speakError: any) {
      console.warn('Text-to-speech failed:', speakError?.message || speakError)
    }
  }

  const handleEndSessionClick = () => {
    setShowEndSessionConfirm(true)
  }

  const handleConfirmEndSession = async () => {
    setShowEndSessionConfirm(false)
    await completeSession()
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

    setTimeout(() => {
      router.push('/dashboard/treatments/life-words')
    }, 2000)
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
          <h2 className="text-4xl font-bold text-green-600 mb-4">Session Complete!</h2>
          <p className="text-xl text-gray-700 mb-4">
            You got {responses.filter(r => r.is_correct).length} out of {responses.length} correct!
          </p>
          <p className="text-lg text-gray-500">Returning to Life Words...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <SessionProgress
          current={currentIndex + 1}
          total={contacts.length}
        />

        {currentContact && (
          <>
            {/* Photo display */}
            <div className={`relative w-80 h-80 md:w-96 md:h-96 rounded-lg overflow-hidden shadow-lg mb-6 transition-all duration-300 ${showSuccess ? 'ring-8 ring-green-500' : 'border-4 border-gray-200'}`}>
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
                          await speak(`Who do you see in this picture?`)
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

            <Timer seconds={timer} />

            {isWaitingForNext && !isAnswering ? (
              <div className="text-center mt-6">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 max-w-2xl">
                  <p className="text-2xl text-green-800 font-semibold">Please wait for the next person</p>
                </div>
              </div>
            ) : isAnswering ? (
              <SpeechRecognitionButton
                key={`speech-${currentIndex}`}
                onResult={handleAnswer}
                disabled={timer === 0 || isProcessingAnswer}
                resetTrigger={currentIndex}
                timer={timer}
                isCorrectAnswer={isProcessingAnswer && timer === 0}
                autoStart={true}
                onStartListening={async () => {
                  if (currentIndex === 0 && !hasSpokenFirstPromptRef.current) {
                    try {
                      await waitForVoices()
                      await speak(`Who do you see in this picture?`)
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
                  setTimer(TIMER_DURATION)
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Sidebar with session info */}
      <div className="lg:w-96 bg-gray-50 p-8 border-l-4 border-gray-200">
        <h3 className="text-3xl font-bold mb-6 text-gray-900">Session Info</h3>
        <div className="space-y-4 text-xl">
          <p><span className="font-bold">Correct:</span> {responses.filter((r) => r.is_correct).length}</p>
          <p><span className="font-bold">Incorrect:</span> {responses.filter((r) => !r.is_correct).length}</p>
          <p><span className="font-bold">Average Cues:</span> {responses.length > 0
            ? (responses.reduce((sum, r) => sum + r.cues_used, 0) / responses.length).toFixed(1)
            : '0'}</p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleEndSessionClick}
            className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 px-6 rounded-lg text-lg transition-colors"
          >
            End Session Early
          </button>
        </div>

        {/* End session confirmation modal */}
        {showEndSessionConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <h4 className="text-2xl font-bold text-gray-900 mb-4">End Session?</h4>
              <p className="text-lg text-gray-700 mb-6">
                Are you sure you want to end this session? Your progress will be saved.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowEndSessionConfirm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg text-lg transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleConfirmEndSession}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
