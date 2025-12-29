'use client'

import { useState, useEffect, useRef } from 'react'
import { speak, waitForVoices } from '@/lib/utils/textToSpeech'
import SpeechRecognitionButton from '@/components/word-finding/SpeechRecognitionButton'

interface PersonalContact {
  id: string
  name: string
  nickname?: string
  relationship: string
  first_letter?: string
  category?: string
  description?: string
  association?: string
  location_context?: string
}

interface PersonalizedCueSystemProps {
  contact: PersonalContact
  cuesUsed: number
  onAnswer: (answer: string, isCorrect: boolean) => void
  onFinalAnswer: () => void
  onContinue: () => void
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: 'your spouse',
  child: 'your child',
  grandchild: 'your grandchild',
  parent: 'your parent',
  sibling: 'your sibling',
  friend: 'your friend',
  pet: 'your pet',
  caregiver: 'your caregiver',
  neighbor: 'your neighbor',
  other: 'someone you know',
}

// Generate cue types based on available contact data
function getCueTypes(contact: PersonalContact) {
  const cues: { level: number; name: string; getText: () => string }[] = []

  // Level 1: First letter (always available)
  cues.push({
    level: 1,
    name: 'First Letter',
    getText: () => `Their name starts with '${contact.first_letter || contact.name[0].toUpperCase()}'`
  })

  // Level 2: Relationship (always available)
  cues.push({
    level: 2,
    name: 'Relationship',
    getText: () => `This is ${RELATIONSHIP_LABELS[contact.relationship] || contact.relationship}`
  })

  // Level 3: Description (if available)
  if (contact.description) {
    cues.push({
      level: 3,
      name: 'Description',
      getText: () => contact.description!
    })
  } else {
    // Fallback: more specific relationship hint
    cues.push({
      level: 3,
      name: 'Hint',
      getText: () => `Think about ${RELATIONSHIP_LABELS[contact.relationship] || 'someone special'} in your life`
    })
  }

  // Level 4: Phonemic cue (first syllable approximation)
  const firstTwoLetters = contact.name.substring(0, Math.min(3, contact.name.length))
  cues.push({
    level: 4,
    name: 'Phonemic',
    getText: () => `Their name sounds like '${firstTwoLetters}...'`
  })

  // Level 5: Association (if available)
  if (contact.association) {
    cues.push({
      level: 5,
      name: 'Association',
      getText: () => contact.association!
    })
  } else if (contact.location_context) {
    cues.push({
      level: 5,
      name: 'Location',
      getText: () => contact.location_context!
    })
  } else {
    cues.push({
      level: 5,
      name: 'Memory',
      getText: () => `Think of a happy memory with ${RELATIONSHIP_LABELS[contact.relationship] || 'this person'}`
    })
  }

  // Level 6: Full name shown (visual cue)
  cues.push({
    level: 6,
    name: 'Name Shown',
    getText: () => `Their name is: ${contact.name}`
  })

  // Level 7: Full name + audio (repetition)
  cues.push({
    level: 7,
    name: 'Say Together',
    getText: () => `Say the name with me: ${contact.name}`
  })

  return cues
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

export function PersonalizedCueSystem({
  contact,
  cuesUsed,
  onAnswer,
  onFinalAnswer,
  onContinue,
}: PersonalizedCueSystemProps) {
  const CUE_TYPES = getCueTypes(contact)
  const [currentCueLevel, setCurrentCueLevel] = useState(cuesUsed + 1)
  const [cueText, setCueText] = useState('')
  const [hasSpoken, setHasSpoken] = useState(false)
  const [isShowingFinalAnswer, setIsShowingFinalAnswer] = useState(false)
  const finalAnswerCalledRef = useRef(false)
  const currentSpeechRef = useRef<{ level: number; cancelled: boolean } | null>(null)
  const initializedRef = useRef(false)
  const previousCuesUsedRef = useRef(cuesUsed)

  // Sync currentCueLevel when cuesUsed prop changes
  useEffect(() => {
    const expectedLevel = cuesUsed + 1
    const cuesUsedChanged = previousCuesUsedRef.current !== cuesUsed

    if (cuesUsed === 0) {
      initializedRef.current = false
    }

    if (cuesUsedChanged) {
      setCurrentCueLevel(expectedLevel)
      setHasSpoken(false)
      initializedRef.current = true
      previousCuesUsedRef.current = cuesUsed
    } else if (!initializedRef.current) {
      setCurrentCueLevel(expectedLevel)
      setHasSpoken(false)
      initializedRef.current = true
      previousCuesUsedRef.current = cuesUsed
    }
  }, [cuesUsed])

  useEffect(() => {
    finalAnswerCalledRef.current = false
    setIsShowingFinalAnswer(false)

    if (currentCueLevel > 7) {
      if (!finalAnswerCalledRef.current) {
        finalAnswerCalledRef.current = true
        handleFinalAnswer()
      }
      return
    }

    const cue = CUE_TYPES[currentCueLevel - 1]
    if (!cue) return

    const text = cue.getText()
    setCueText(text)
    setHasSpoken(false)

    const speechOperation = { level: currentCueLevel, cancelled: false }
    currentSpeechRef.current = speechOperation

    let finalAnswerTimeout: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const speakCue = async () => {
      if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
        return
      }

      try {
        await waitForVoices()

        if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
          return
        }

        await new Promise(resolve => setTimeout(resolve, 300))

        if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
          return
        }

        await speak(text)

        if (speechOperation.cancelled || currentSpeechRef.current !== speechOperation) {
          return
        }

        setHasSpoken(true)

        if (currentCueLevel === 7 && !speechOperation.cancelled) {
          finalAnswerTimeout = setTimeout(() => {
            if (!finalAnswerCalledRef.current && !speechOperation.cancelled) {
              finalAnswerCalledRef.current = true
              handleFinalAnswer()
            }
          }, 30000)
        }
      } catch (error) {
        console.warn(`Failed to speak cue ${currentCueLevel}:`, error)
        if (!speechOperation.cancelled && currentSpeechRef.current === speechOperation) {
          setHasSpoken(true)
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

    const speakDelay = setTimeout(() => {
      if (currentCueLevel > 7 || speechOperation.cancelled) {
        return
      }

      speakCue()

      timeoutId = setTimeout(() => {
        if (!speechOperation.cancelled && currentSpeechRef.current === speechOperation) {
          setHasSpoken(true)
        }
      }, 3000)
    }, 100)

    return () => {
      clearTimeout(speakDelay)
      if (timeoutId) clearTimeout(timeoutId)
      if (finalAnswerTimeout) clearTimeout(finalAnswerTimeout)
      if (currentSpeechRef.current === speechOperation) {
        speechOperation.cancelled = true
        currentSpeechRef.current = null
      }
    }
  }, [currentCueLevel, contact])

  const handleFinalAnswer = async () => {
    if (finalAnswerCalledRef.current) {
      return
    }
    finalAnswerCalledRef.current = true

    setIsShowingFinalAnswer(true)
    setHasSpoken(false)

    try {
      await speak(`This is ${contact.name}`)
    } catch (error) {
      console.warn('Failed to speak final answer:', error)
    }

    onFinalAnswer()
  }

  const handleAnswer = (transcript: string) => {
    const isCorrect = matchPersonalAnswer(transcript, contact)

    if (isCorrect) {
      onAnswer(transcript, true)
    } else {
      if (currentCueLevel < 7) {
        onAnswer(transcript, false)
      } else {
        if (!finalAnswerCalledRef.current) {
          handleFinalAnswer()
        }
      }
    }
  }

  if (currentCueLevel > 7) {
    return (
      <div className="text-center max-w-2xl">
        <p className="text-xl mb-6">The correct name has been provided.</p>
        <button
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          onClick={onContinue}
          style={{ minHeight: '44px' }}
        >
          Continue to Next Person
        </button>
      </div>
    )
  }

  const currentCue = CUE_TYPES[currentCueLevel - 1]
  if (!currentCue) return null

  return (
    <div className="text-center w-full max-w-2xl">
      <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-8 mb-6">
        <h5 className="text-3xl font-bold text-blue-900 mb-4">
          Cue {currentCueLevel}: {currentCue.name}
        </h5>
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
          <p className="text-gray-600 text-xl">Moving to next person...</p>
        </div>
      )}
    </div>
  )
}
