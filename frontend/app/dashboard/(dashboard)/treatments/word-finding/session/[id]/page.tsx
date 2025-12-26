'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ImageDisplay, { ImageDisplayRef } from '@/components/word-finding/ImageDisplay'
import SpeechRecognitionButton from '@/components/word-finding/SpeechRecognitionButton'
import CueSystem from '@/components/word-finding/CueSystem'
import Timer from '@/components/word-finding/Timer'
import SessionProgress from '@/components/word-finding/SessionProgress'
import { matchAnswer, extractAnswer } from '@/lib/matching/answerMatcher'
import { speak, waitForVoices } from '@/lib/utils/textToSpeech'
import { getRandomPositiveFeedback } from '@/lib/utils/positiveFeedback'

const TIMER_DURATION = 30 // seconds

interface Stimulus {
  id: number
  image: string
  name: string
  first_letter: string
  category: string
  action: string
  association: string
  features: string
  location: string
  alternatives: string[]
}

interface Session {
  id: string
  user_id: string
  stimuli_ids: number[]
  started_at: string
  is_completed: boolean
}

interface SessionResponse {
  id: string
  session_id: string
  stimulus_id: number
  is_correct: boolean
  cues_used: number
  response_time: number
  user_answer: string | null
  correct_answer: string
  completed_at: string
}

export default function WordFindingSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [session, setSession] = useState<Session | null>(null)
  const [stimuli, setStimuli] = useState<Stimulus[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null)
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
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const imageDisplayRef = useRef<ImageDisplayRef>(null)
  const isProcessingAnswerRef = useRef(false)
  const currentStimulusRef = useRef<Stimulus | null>(null)
  const currentIndexRef = useRef(0)
  const hasSpokenFirstPromptRef = useRef(false)

  // Initialize session
  useEffect(() => {
    initializeSession()
  }, [])

  // Timer countdown - runs when answering OR when in cue system
  const handleTimeoutRef = useRef<() => Promise<void>>()

  useEffect(() => {
    handleTimeoutRef.current = handleTimeout
  }, [cuesUsed, isAnswering, currentStimulus, session])

  useEffect(() => {
    // Timer should run when:
    // 1. Answering (isAnswering = true), OR
    // 2. In cue system (!isAnswering && currentStimulus exists, meaning CueSystem is shown)
    const isInCueSystem = !isAnswering && currentStimulus !== null
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
  }, [isAnswering, currentStimulus, timer, isCompleted])

  const initializeSession = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get session from backend API
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/word-finding/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load session')
      }

      const sessionData = await response.json()
      setSession(sessionData.session as Session)

      // Get stimuli for this session
      const stimuliIds = sessionData.session.stimuli_ids
      const { data: allStimuli, error: stimuliError } = await supabase
        .from('word_finding_stimuli')
        .select('*')
        .in('id', stimuliIds)

      if (stimuliError) {
        throw new Error(`Failed to fetch stimuli: ${stimuliError.message}`)
      }

      if (!allStimuli || allStimuli.length === 0) {
        throw new Error('No stimuli found for this session')
      }

      // Sort stimuli according to the order in stimuli_ids
      const orderedStimuli = stimuliIds
        .map(id => allStimuli.find(s => s.id === id))
        .filter(Boolean) as Stimulus[]

      setStimuli(orderedStimuli)
      setCurrentIndex(0)
      currentIndexRef.current = 0
      setCurrentStimulus(orderedStimuli[0])
      currentStimulusRef.current = orderedStimuli[0]
      setIsAnswering(true)
      setTimer(TIMER_DURATION)

      // Reset the prompt flag for new session
      hasSpokenFirstPromptRef.current = false
      setHasSpokenFirstPrompt(false)

      // Set loading to false so component can render
      setLoading(false)

    } catch (err: any) {
      console.error('Session initialization error:', err)
      const errorMessage = err?.message || 'Failed to initialize session'
      setError(`Failed to initialize session: ${errorMessage}`)
      setLoading(false)
    }
  }

  const handleAnswer = async (transcript: string) => {
    const currentStim = currentStimulusRef.current
    const isProcessing = isProcessingAnswerRef.current

    if (!currentStim || !session || isProcessing) {
      console.log('handleAnswer skipped:', {
        hasStimulus: !!currentStim,
        hasSession: !!session,
        isProcessing: isProcessing,
        stimulusName: currentStim?.name
      })
      return
    }

    setIsProcessingAnswer(true)
    isProcessingAnswerRef.current = true

    try {
      const answer = extractAnswer(transcript)
      const isCorrect = matchAnswer(answer, currentStim)

      console.log('Answer check:', {
        transcript,
        extracted: answer,
        stimulus: currentStim.name,
        isCorrect,
        currentIndex
      })

      if (isCorrect) {
        await handleCorrectAnswer(answer)
      } else {
        // Answer is incorrect - trigger cue system
        console.log('Incorrect answer, showing cue system')
        setIsProcessingAnswer(false)
        isProcessingAnswerRef.current = false
        setCuesUsed(0) // Set to 0 to show the first cue (CueSystem uses cuesUsed + 1)
        setIsAnswering(false) // This will show the CueSystem component
        setTimer(TIMER_DURATION) // Reset timer to 30 seconds for the cue
      }
    } catch (err) {
      console.error('Error handling answer:', err)
      setIsProcessingAnswer(false)
      isProcessingAnswerRef.current = false
    }
  }

  const handleCorrectAnswer = async (userAnswer: string) => {
    const currentStim = currentStimulusRef.current
    if (!currentStim || !session) {
      setIsProcessingAnswer(false)
      isProcessingAnswerRef.current = false
      return
    }

    // Stop the timer immediately when correct answer is given
    setTimer(0)
    // Hide the button and show waiting message
    console.log('handleCorrectAnswer: Setting isAnswering=false, isWaitingForNext=true')
    setIsAnswering(false)
    setIsWaitingForNext(true)

    // Save response
    await saveResponse(true, userAnswer)

    // Show success animation
    imageDisplayRef.current?.triggerSuccess()

    // Play success feedback with random positive message
    try {
      const feedbackMessage = getRandomPositiveFeedback()
      await speak(feedbackMessage)
    } catch (speakError: any) {
      console.warn('Text-to-speech failed:', speakError?.message || speakError)
    }

    // Move to next image after a delay
    setTimeout(async () => {
      await moveToNext()
    }, 2000)
  }

  const handleTimeout = async () => {
    if (!currentStimulus || !session) return

    console.log('handleTimeout called:', { cuesUsed, isAnswering, timer })

    // If currently answering (not in cue system yet), start cue system with first cue
    if (isAnswering && cuesUsed === 0) {
      console.log('Starting cue system - first timeout')
      setCuesUsed(0) // Keep at 0 to show first cue (CueSystem uses cuesUsed + 1)
      setIsAnswering(false) // This will show the CueSystem component
      // Reset timer
      setTimeout(() => {
        setTimer(TIMER_DURATION)
      }, 0)
    } else if (!isAnswering && cuesUsed < 7) {
      // Already in cue system, advance to next cue
      console.log('Timeout during cues - advancing to next cue. Current cuesUsed:', cuesUsed)
      const nextCuesUsed = cuesUsed + 1
      console.log('Incrementing cuesUsed from', cuesUsed, 'to', nextCuesUsed)
      setCuesUsed(nextCuesUsed)
      setIsAnswering(false) // Ensure CueSystem is shown
      // Reset timer
      setTimeout(() => {
        console.log('Resetting timer to', TIMER_DURATION, 'for next cue')
        setTimer(TIMER_DURATION)
      }, 50)
    } else {
      // All cues exhausted (cuesUsed >= 7) - save as incorrect and move to next
      await saveResponse(false, null)
      try {
        await speak(`The name of this object is ${currentStimulus.name}`)
      } catch (speakError: any) {
        console.warn('Text-to-speech failed:', speakError?.message || speakError)
      }
      moveToNext()
    }
  }

  const handleCueAnswer = async (userAnswer: string, isCorrect: boolean) => {
    if (!currentStimulus || !session) return

    if (isCorrect) {
      // Save with cuesUsed + 1 because cuesUsed represents cues shown before current cue
      await saveResponse(true, userAnswer, cuesUsed + 1)
      try {
        const feedbackMessage = getRandomPositiveFeedback()
        await speak(feedbackMessage)
      } catch (speakError: any) {
        console.warn('Text-to-speech failed:', speakError?.message || speakError)
      }
      moveToNext()
    } else {
      // Continue with next cue - increment cuesUsed
      setCuesUsed((prev) => prev + 1)
      setTimer(TIMER_DURATION) // Reset timer to 30 seconds for the next cue
    }
  }

  const handleFinalAnswer = async () => {
    if (!currentStimulus || !session) return

    // All cues exhausted - 7 cues were shown
    await saveResponse(false, null, 7)
    // CueSystem already spoke the answer
    // Just move to next item
    moveToNext()
  }

  const saveResponse = async (isCorrect: boolean, userAnswer: string | null, cuesUsedOverride?: number) => {
    const currentStim = currentStimulusRef.current
    if (!currentStim || !session) return

    const responseTime = TIMER_DURATION - timer

    // Use override if provided, otherwise use current cuesUsed state
    const actualCuesUsed = cuesUsedOverride !== undefined ? cuesUsedOverride : cuesUsed

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/word-finding/sessions/${session.id}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stimulus_id: currentStim.id,
          is_correct: isCorrect,
          cues_used: actualCuesUsed,
          response_time: responseTime,
          user_answer: userAnswer,
          correct_answer: currentStim.name,
        })
      })

      if (!response.ok) {
        console.error('Failed to save response')
      }

      // Update local state
      const newResponse: SessionResponse = {
        id: '',
        session_id: session.id,
        stimulus_id: currentStim.id,
        is_correct: isCorrect,
        cues_used: actualCuesUsed,
        response_time: responseTime,
        user_answer: userAnswer,
        correct_answer: currentStim.name,
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

    console.log('moveToNext called:', {
      currentIdx,
      nextIndex,
      stimuliLength: stimuli.length
    })

    if (nextIndex >= stimuli.length) {
      // Session complete
      completeSession()
      return
    }

    // Move to next image
    const nextStimulus = stimuli[nextIndex]
    console.log('Moving to next:', {
      fromIndex: currentIdx,
      toIndex: nextIndex,
      stimulus: nextStimulus.name
    })

    // Update refs immediately (synchronously)
    currentIndexRef.current = nextIndex
    currentStimulusRef.current = nextStimulus
    isProcessingAnswerRef.current = false

    // Update state (asynchronously)
    setCurrentIndex(nextIndex)
    setCurrentStimulus(nextStimulus)
    setCuesUsed(0)
    setIsAnswering(true)
    setTimer(TIMER_DURATION)
    setIsProcessingAnswer(false)
    setIsWaitingForNext(false) // Reset waiting state - show button again

    try {
      await speak(`What is this object?`)
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

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/word-finding/sessions/${session.id}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
        }
      })
    } catch (error) {
      console.error('Error completing session:', error)
    }

    // Redirect to progress page
    setTimeout(() => {
      router.push('/dashboard/progress')
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
            onClick={() => router.push('/dashboard/treatments/word-finding')}
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
          <p className="text-xl text-gray-700">Redirecting to progress page...</p>
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
          total={stimuli.length}
        />

        {currentStimulus && (
          <>
            <ImageDisplay
              ref={imageDisplayRef}
              image={`/images/word-finding/${currentStimulus.image}`}
              name={currentStimulus.name}
              onImageLoad={() => {
                // Try to speak prompt when first image loads
                if (currentIndex === 0 && !hasSpokenFirstPromptRef.current) {
                  setTimeout(async () => {
                    if (!hasSpokenFirstPromptRef.current) {
                      try {
                        console.log('First image displayed - attempting to speak prompt')
                        await waitForVoices()
                        await speak(`What is this object?`)
                        hasSpokenFirstPromptRef.current = true
                        setHasSpokenFirstPrompt(true)
                        console.log('Successfully spoke prompt when image displayed')
                      } catch (error: any) {
                        // Silently fail - will play when user clicks button instead
                        console.log('TTS blocked by browser (will play on button click):', error?.message || error)
                      }
                    }
                  }, 300)
                }
              }}
            />

            <Timer seconds={timer} />

            {isWaitingForNext && !isAnswering ? (
              <div className="text-center mt-6">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 max-w-2xl">
                  <p className="text-2xl text-green-800 font-semibold">Please wait for the next object</p>
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
                  // When user clicks to start listening on first image, speak the prompt first
                  if (currentIndex === 0 && !hasSpokenFirstPromptRef.current) {
                    try {
                      console.log('First image - speaking "What is this object?"')
                      await waitForVoices()
                      await speak(`What is this object?`)
                      hasSpokenFirstPromptRef.current = true
                      setHasSpokenFirstPrompt(true)
                      console.log('Successfully spoke prompt for first image')
                    } catch (error: any) {
                      console.warn('Failed to speak prompt:', error)
                    }
                  }
                }}
              />
            ) : (
              // Show CueSystem when not answering (timeout or incorrect answer)
              <CueSystem
                stimulus={currentStimulus}
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
            : '0'}
          </p>
        </div>
        <div className="mt-8">
          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-offset-2"
            onClick={handleEndSessionClick}
            disabled={isCompleted}
            style={{ minHeight: '44px' }}
          >
            End Session Early
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showEndSessionConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEndSessionConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h5 className="text-2xl font-bold">End Session Early?</h5>
            </div>
            <div className="p-6">
              <p className="text-xl mb-4">
                You have completed {responses.length} of {stimuli.length} items.
                Are you sure you want to end this session early?
              </p>
              <p className="text-gray-600 mb-0">
                Your progress will be saved and you can view it on the progress page.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-4">
              <button
                type="button"
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg text-lg"
                onClick={() => setShowEndSessionConfirm(false)}
              >
                Continue Session
              </button>
              <button
                type="button"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg text-lg"
                onClick={handleConfirmEndSession}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
