'use client'

import { useState, useEffect, useRef } from 'react'
import { speak, waitForVoices, type VoiceGender } from '@/lib/utils/textToSpeech'
import { matchAnswer, extractAnswer } from '@/lib/matching/answerMatcher'
import SpeechRecognitionButton from './SpeechRecognitionButton'

interface Stimulus {
  id: number
  name: string
  first_letter: string
  category: string
  action: string
  association: string
  features: string
  location: string
  alternatives: string[]
}

interface CueSystemProps {
  stimulus: Stimulus
  cuesUsed: number
  onAnswer: (answer: string, isCorrect: boolean) => void
  onFinalAnswer: () => void
  onContinue: () => void
  voiceGender?: VoiceGender
}

const CUE_TYPES = [
  { level: 1, name: 'Alphabetic', getText: (s: Stimulus) => `It starts with a '${s.first_letter}'` },
  { level: 2, name: 'Category', getText: (s: Stimulus) => `This is a type of ${s.category}` },
  { level: 3, name: 'Action', getText: (s: Stimulus) => s.action },
  { level: 4, name: 'Association', getText: (s: Stimulus) => `This goes with ${s.association}` },
  { level: 5, name: 'Features', getText: (s: Stimulus) => s.features },
  { level: 6, name: 'Location', getText: (s: Stimulus) => s.location },
  { level: 7, name: 'Repetition', getText: (s: Stimulus) => `Say the word ${s.name}` },
]

export default function CueSystem({
  stimulus,
  cuesUsed,
  onAnswer,
  onFinalAnswer,
  onContinue,
  voiceGender = 'female',
}: CueSystemProps) {
  const [currentCueLevel, setCurrentCueLevel] = useState(cuesUsed + 1)
  const [cueText, setCueText] = useState('')
  const [hasSpoken, setHasSpoken] = useState(false)
  const [isShowingFinalAnswer, setIsShowingFinalAnswer] = useState(false)
  const finalAnswerCalledRef = useRef(false) // Prevent multiple calls to handleFinalAnswer
  const currentSpeechRef = useRef<{ level: number; cancelled: boolean } | null>(null) // Track current speech operation

  // Sync currentCueLevel when cuesUsed prop changes
  const initializedRef = useRef(false)
  const previousCuesUsedRef = useRef(cuesUsed)

  useEffect(() => {
    const expectedLevel = cuesUsed + 1
    const cuesUsedChanged = previousCuesUsedRef.current !== cuesUsed

    console.log('CueSystem sync effect running:', {
      cuesUsed,
      currentCueLevel,
      expectedLevel,
      cuesUsedChanged,
      previousCuesUsed: previousCuesUsedRef.current,
      initialized: initializedRef.current
    })

    // Always sync when cuesUsed changes (from parent), but reset initialization flag when entering cue system
    if (cuesUsed === 0) {
      initializedRef.current = false // Reset when entering cue system
    }

    // Only sync when cuesUsed prop changes (not when currentCueLevel changes internally)
    if (cuesUsedChanged) {
      console.log('Syncing currentCueLevel with cuesUsed (prop changed):', {
        currentCueLevel,
        expectedLevel,
        cuesUsed,
        previousCuesUsed: previousCuesUsedRef.current,
        willSetTo: expectedLevel
      })
      setCurrentCueLevel(expectedLevel)
      setHasSpoken(false)
      initializedRef.current = true
      previousCuesUsedRef.current = cuesUsed
    } else if (!initializedRef.current) {
      // Initial sync when component first mounts
      console.log('Initial sync when component mounts:', { expectedLevel })
      setCurrentCueLevel(expectedLevel)
      setHasSpoken(false)
      initializedRef.current = true
      previousCuesUsedRef.current = cuesUsed
    } else {
      console.log('No sync needed - cuesUsed unchanged or already initialized')
    }
  }, [cuesUsed])

  useEffect(() => {
    // Reset the final answer flag and state when cue changes
    finalAnswerCalledRef.current = false
    setIsShowingFinalAnswer(false)

    if (currentCueLevel > 7) {
      // All cues exhausted
      if (!finalAnswerCalledRef.current) {
        finalAnswerCalledRef.current = true
        handleFinalAnswer()
      }
      return
    }

    const cue = CUE_TYPES[currentCueLevel - 1]
    const text = cue.getText(stimulus)
    setCueText(text)
    setHasSpoken(false) // Reset hasSpoken when cue changes

    // Track this speech operation
    const speechOperation = { level: currentCueLevel, cancelled: false }
    currentSpeechRef.current = speechOperation

    // Speak the cue with timeout fallback
    let finalAnswerTimeout: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    // Ensure voices are loaded before speaking
    const speakCue = async () => {
      // Check if this speech operation was cancelled
      if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
        console.log(`Cue ${currentCueLevel} speech cancelled before starting`)
        return
      }

      try {
        console.log(`Speaking cue ${currentCueLevel}: "${text}"`)
        // Wait for voices to be loaded
        await waitForVoices()

        // Check again if cancelled during voice loading
        if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
          console.log(`Cue ${currentCueLevel} speech cancelled during voice loading`)
          return
        }

        // Small delay to ensure previous speech is finished (speak() will cancel it anyway)
        await new Promise(resolve => setTimeout(resolve, 300))

        // Check again if cancelled during delay
        if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
          console.log(`Cue ${currentCueLevel} speech cancelled during delay`)
          return
        }

        // Now speak the cue (this will cancel any previous speech)
        await speak(text, { gender: voiceGender })

        // Check if cancelled after speaking
        if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
          console.log(`Cue ${currentCueLevel} speech cancelled after speaking`)
          return
        }

        setHasSpoken(true)
        console.log(`Successfully spoke cue ${currentCueLevel}`)

        // If this is cue 7 (last cue), automatically score as incorrect and move to next after timeout
        if (currentCueLevel === 7 && !speechOperation.cancelled) {
          // Wait longer to give user a chance to answer (30 seconds)
          finalAnswerTimeout = setTimeout(() => {
            if (!finalAnswerCalledRef.current && !speechOperation.cancelled) {
              finalAnswerCalledRef.current = true
              handleFinalAnswer()
            }
          }, 30000) // 30 seconds to match timer duration
        }
      } catch (error) {
        // If TTS fails, still show the button so user can proceed
        console.warn(`Failed to speak cue ${currentCueLevel}:`, error)
        if (!speechOperation.cancelled && currentSpeechRef.current === speechOperation) {
          setHasSpoken(true)
          // For cue 7, set timeout even if TTS fails
          if (currentCueLevel === 7) {
            finalAnswerTimeout = setTimeout(() => {
              if (!finalAnswerCalledRef.current && !speechOperation.cancelled) {
                finalAnswerCalledRef.current = true
                handleFinalAnswer()
              }
            }, 30000)
          }
        }
      } finally {
        if (timeoutId && !speechOperation.cancelled) {
          clearTimeout(timeoutId)
        }
      }
    }

    // Small delay to ensure state is fully updated before speaking
    const speakDelay = setTimeout(() => {
      // Verify we're still on the same cue level (in case it changed during delay)
      if (currentCueLevel > 7 || speechOperation.cancelled) {
        return
      }

      // Start speaking
      speakCue()

      // Fallback: if TTS takes too long or hangs, show button anyway after 3 seconds
      timeoutId = setTimeout(() => {
        if (!speechOperation.cancelled && currentSpeechRef.current === speechOperation) {
          console.log(`Cue ${currentCueLevel} TTS timeout - showing button anyway`)
          setHasSpoken(true)
        }
      }, 3000)
    }, 100) // Small delay to ensure state updates are processed

    // Cleanup: clear timeouts if component unmounts or cue changes
    return () => {
      clearTimeout(speakDelay)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (finalAnswerTimeout) {
        clearTimeout(finalAnswerTimeout)
      }
      if (currentSpeechRef.current === speechOperation) {
        speechOperation.cancelled = true
        console.log(`Cleaning up cue ${currentCueLevel} speech`)
        currentSpeechRef.current = null
      }
    }
  }, [currentCueLevel, stimulus])

  const handleFinalAnswer = async () => {
    // Prevent multiple calls
    if (finalAnswerCalledRef.current) {
      return
    }
    finalAnswerCalledRef.current = true

    // Hide the speech recognition button immediately
    setIsShowingFinalAnswer(true)
    setHasSpoken(false)

    // Speak the answer only once
    try {
      await speak(`The name of this object is ${stimulus.name}`, { gender: voiceGender })
    } catch (error) {
      console.warn('Failed to speak final answer:', error)
    }

    // Call parent's handler (which will save response and move to next)
    onFinalAnswer()
  }

  const handleAnswer = (transcript: string) => {
    const answer = extractAnswer(transcript)
    const isCorrect = matchAnswer(answer, stimulus)

    if (isCorrect) {
      onAnswer(answer, true)
    } else {
      // Wrong answer
      if (currentCueLevel < 7) {
        // Call onAnswer with isCorrect: false so parent increments cuesUsed
        onAnswer(answer, false)
      } else {
        // Last cue (cue 7) was wrong, show final answer
        if (!finalAnswerCalledRef.current) {
          handleFinalAnswer()
        }
      }
    }
  }

  if (currentCueLevel > 7) {
    return (
      <div className="text-center max-w-2xl">
        <p className="text-xl mb-6">The correct answer has been provided.</p>
        <button
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          onClick={onContinue}
          style={{ minHeight: '44px' }}
        >
          Continue to Next Image
        </button>
      </div>
    )
  }

  const currentCue = CUE_TYPES[currentCueLevel - 1]

  return (
    <div className="text-center w-full max-w-2xl">
      <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-8 mb-6">
        <h5 className="text-3xl font-bold text-blue-900 mb-4">Cue {currentCueLevel}: {currentCue.name}</h5>
        <p className="text-2xl text-blue-800 mb-0">{cueText}</p>
      </div>

      {hasSpoken && !isShowingFinalAnswer && (
        <SpeechRecognitionButton
          onResult={handleAnswer}
          disabled={false}
          autoStart={true}
        />
      )}

      {isShowingFinalAnswer && (
        <div className="text-center mt-6">
          <p className="text-gray-600 text-xl">Moving to next item...</p>
        </div>
      )}
    </div>
  )
}
