'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface GroceryItem {
  id: string
  name: string
  category: string
}

interface Trial {
  id: string
  trial_number: number
  items: GroceryItem[]
  items_correct: number
  is_fully_correct: boolean
}

interface Session {
  id: string
  list_length: number
  total_correct: number
  total_trials: number
}

type Phase = 'loading' | 'ready' | 'listening' | 'waiting' | 'recalling' | 'feedback' | 'complete'

export default function STMSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [phase, setPhase] = useState<Phase>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null)
  const [trialNumber, setTrialNumber] = useState(1)
  const [timer, setTimer] = useState(30)
  const [userRecall, setUserRecall] = useState<string[]>([])
  const [matches, setMatches] = useState<{target: string, spoken: string | null, isCorrect: boolean}[]>([])
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [results, setResults] = useState<{correct: number, total: number}[]>([])

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentTrialRef = useRef<Trial | null>(null)

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  // Load session
  useEffect(() => {
    loadSession()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [sessionId])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return null
    }
    return {
      'Authorization': 'Bearer ' + session.access_token,
      'Content-Type': 'application/json'
    }
  }

  const loadSession = async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(apiUrl + '/api/short-term-memory/sessions/' + sessionId, { headers })

    if (response.ok) {
      const data = await response.json()
      setSession(data)
      setPhase('ready')
    } else {
      router.push('/dashboard/treatments/short-term-memory')
    }
  }

  const startTrial = async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(
      apiUrl + '/api/short-term-memory/sessions/' + sessionId + '/trials?trial_number=' + trialNumber,
      { method: 'POST', headers }
    )

    if (response.ok) {
      const trial = await response.json()
      setCurrentTrial(trial)
      currentTrialRef.current = trial
      setPhase('listening')
      speakList(trial.items.map((i: GroceryItem) => i.name))
    }
  }

  const speakList = (items: string[]) => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const text = items.join(', ')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.8

    utterance.onend = () => {
      setPhase('waiting')
      startTimer()
    }

    window.speechSynthesis.speak(utterance)
  }

  const startTimer = () => {
    setTimer(5)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('recalling')
          speakText('Now speak the items you remember')
          // Delay starting speech recognition to let the prompt finish speaking
          setTimeout(() => startListening(), 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    // Track which results we've already processed to avoid duplicates
    let processedResultsCount = 0

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = ''
      // Only process new results (starting from where we left off)
      for (let i = processedResultsCount; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
          processedResultsCount = i + 1
        }
      }
      if (finalTranscript) {
        // Use just this new transcript, not accumulated
        const newTranscript = finalTranscript.trim()
        setTranscript(newTranscript)

        // Speak what was heard, then auto-submit after speaking
        const utterance = new SpeechSynthesisUtterance('You said: ' + newTranscript)
        utterance.lang = 'en-US'
        utterance.rate = 0.9
        utterance.onend = () => {
          // Auto-submit after speaking back what was heard
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop()
            }
            submitRecallAuto(newTranscript)
          }, 500)
        }
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current.start()
    setIsListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const submitRecallAuto = async (currentTranscript: string) => {
    // Use ref to get the latest trial (not stale closure value)
    const trial = currentTrialRef.current
    if (!trial) return

    // Parse transcript into words - keep words with length > 1 (not just > 2)
    const spokenWords = currentTranscript
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(w => w.length > 1)

    console.log('Transcript:', currentTranscript)
    console.log('Spoken words:', spokenWords)
    console.log('Target items (from ref):', trial.items.map(i => i.name))

    // Match against target items using improved matching
    const targetItems = trial.items.map(i => i.name.toLowerCase())
    const matchResults = targetItems.map(target => {
      const found = spokenWords.find(spoken => wordsMatch(spoken, target))
      return {
        target,
        spoken: found || null,
        isCorrect: !!found
      }
    })

    console.log('Match results:', matchResults)

    setMatches(matchResults)

    // Submit to API
    const headers = await getAuthHeaders()
    if (!headers) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const recallAttempts = matchResults.map(m => ({
      trial_id: trial.id,
      target_item_name: m.target,
      spoken_item: m.spoken,
      is_correct: m.isCorrect,
      is_partial: false,
      match_confidence: m.isCorrect ? 1.0 : 0.0,
      time_to_recall: 0
    }))

    try {
      const response = await fetch(
        apiUrl + '/api/short-term-memory/trials/' + trial.id + '/complete',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ recall_attempts: recallAttempts })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to submit recall:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error submitting recall:', error)
    }

    const correct = matchResults.filter(m => m.isCorrect).length
    setResults(prev => [...prev, { correct, total: targetItems.length }])
    setPhase('feedback')

    // Speak the results
    const resultText = `You got ${correct} out of ${targetItems.length} correct. ` +
      matchResults.map(m => m.target + ': ' + (m.isCorrect ? 'correct' : 'missed')).join('. ')
    speakText(resultText)
  }

  const submitRecall = async () => {
    if (!currentTrial) return

    stopListening()

    // Parse transcript into words - keep words with length > 1
    const spokenWords = transcript
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(w => w.length > 1)

    console.log('Manual submit - Transcript:', transcript)
    console.log('Manual submit - Spoken words:', spokenWords)

    // Match against target items using improved matching
    const targetItems = currentTrial.items.map(i => i.name.toLowerCase())
    const matchResults = targetItems.map(target => {
      const found = spokenWords.find(spoken => wordsMatch(spoken, target))
      return {
        target,
        spoken: found || null,
        isCorrect: !!found
      }
    })

    console.log('Manual submit - Match results:', matchResults)

    setMatches(matchResults)

    // Submit to API
    const headers = await getAuthHeaders()
    if (!headers) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const recallAttempts = matchResults.map(m => ({
      trial_id: currentTrial.id,
      target_item_name: m.target,
      spoken_item: m.spoken,
      is_correct: m.isCorrect,
      is_partial: false,
      match_confidence: m.isCorrect ? 1.0 : 0.0,
      time_to_recall: 0
    }))

    try {
      const response = await fetch(
        apiUrl + '/api/short-term-memory/trials/' + currentTrial.id + '/complete',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ recall_attempts: recallAttempts })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to submit recall:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error submitting recall:', error)
    }

    const correct = matchResults.filter(m => m.isCorrect).length
    setResults(prev => [...prev, { correct, total: targetItems.length }])
    setPhase('feedback')

    // Speak the results
    const resultText = `You got ${correct} out of ${targetItems.length} correct. ` +
      matchResults.map(m => m.target + ': ' + (m.isCorrect ? 'correct' : 'missed')).join('. ')
    speakText(resultText)
  }

  const nextTrial = () => {
    setTranscript('')
    setMatches([])

    if (trialNumber >= 10) {
      completeSession()
    } else {
      const nextTrialNum = trialNumber + 1
      setTrialNumber(nextTrialNum)
      // Automatically start the next trial
      startTrialWithNumber(nextTrialNum)
    }
  }

  const startTrialWithNumber = async (trialNum: number) => {
    // Clear previous trial's transcript before starting new trial
    setTranscript('')

    const headers = await getAuthHeaders()
    if (!headers) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(
      apiUrl + '/api/short-term-memory/sessions/' + sessionId + '/trials?trial_number=' + trialNum,
      { method: 'POST', headers }
    )

    if (response.ok) {
      const trial = await response.json()
      setCurrentTrial(trial)
      currentTrialRef.current = trial
      setPhase('listening')
      speakList(trial.items.map((i: GroceryItem) => i.name))
    }
  }

  const completeSession = async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    await fetch(
      apiUrl + '/api/short-term-memory/sessions/' + sessionId + '/complete',
      { method: 'POST', headers }
    )

    setPhase('complete')
  }

  // Simple Levenshtein distance for fuzzy matching
  function levenshtein(a: string, b: string): number {
    const matrix = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  // Normalize word for matching (handle plurals, common speech recognition errors)
  function normalizeWord(word: string): string {
    let normalized = word.toLowerCase().trim()
    // Remove trailing 's' for plural handling
    if (normalized.endsWith('s') && normalized.length > 3) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  // Check if two words match with flexible matching
  function wordsMatch(spoken: string, target: string): boolean {
    const spokenNorm = normalizeWord(spoken)
    const targetNorm = normalizeWord(target)

    // Exact match after normalization
    if (spokenNorm === targetNorm) return true

    // One contains the other (for compound words or partial recognition)
    if (spokenNorm.includes(targetNorm) || targetNorm.includes(spokenNorm)) return true

    // Calculate Levenshtein distance with dynamic threshold based on word length
    const maxLen = Math.max(spokenNorm.length, targetNorm.length)
    const threshold = maxLen <= 4 ? 1 : maxLen <= 6 ? 2 : 3
    if (levenshtein(spokenNorm, targetNorm) <= threshold) return true

    // Check without trailing 's' on both
    const spokenNoS = spokenNorm.replace(/s$/, '')
    const targetNoS = targetNorm.replace(/s$/, '')
    if (spokenNoS === targetNoS) return true
    if (levenshtein(spokenNoS, targetNoS) <= threshold) return true

    return false
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-2xl">Loading session...</div>
      </div>
    )
  }

  if (phase === 'complete') {
    const totalCorrect = results.reduce((sum, r) => sum + r.correct, 0)
    const totalPossible = results.reduce((sum, r) => sum + r.total, 0)
    const accuracy = totalPossible > 0 ? (totalCorrect / totalPossible) * 100 : 0

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold mb-6">Session Complete!</h1>

          <div className="text-6xl font-bold text-[var(--color-primary)] mb-2">
            {totalCorrect}
          </div>
          <p className="text-xl text-gray-600 mb-6">
            items remembered correctly out of {totalPossible}
          </p>

          <div className="mb-8">
            <div className="text-2xl font-bold mb-2">{Math.round(accuracy)}% Accuracy</div>
            <div className="bg-gray-200 rounded-full h-4 max-w-md mx-auto">
              <div
                className={'h-4 rounded-full ' + (accuracy >= 80 ? 'bg-green-500' : accuracy >= 60 ? 'bg-yellow-500' : 'bg-blue-500')}
                style={{ width: accuracy + '%' }}
              />
            </div>
          </div>

          <div className="space-y-2 mb-8">
            {results.map((r, i) => (
              <div key={i} className={'p-2 rounded ' + (r.correct === r.total ? 'bg-green-100' : r.correct > 0 ? 'bg-yellow-100' : 'bg-gray-100')}>
                Trial {i + 1}: {r.correct} / {r.total}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Link
              href="/dashboard/treatments/short-term-memory"
              className="block w-full bg-[var(--color-primary)] text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              Start New Session
            </Link>
            <Link
              href="/dashboard"
              className="block text-[var(--color-primary)] hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">Trial {trialNumber} of 10</h2>
          <div className="text-gray-600">
            {session?.list_length} items per list
          </div>
        </div>

        {/* Ready Phase */}
        {phase === 'ready' && (
          <div className="text-center">
            <p className="text-xl mb-8">
              Get ready to hear {session?.list_length} grocery items.
            </p>
            <button
              onClick={startTrial}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              Start Trial
            </button>
          </div>
        )}

        {/* Listening Phase */}
        {phase === 'listening' && (
          <div className="text-center">
            <div className="text-6xl mb-6">🔊</div>
            <p className="text-2xl font-bold mb-4">Listen carefully...</p>
            <p className="text-gray-600">The list is being spoken</p>
          </div>
        )}

        {/* Waiting Phase */}
        {phase === 'waiting' && (
          <div className="text-center">
            <div className="w-48 h-48 rounded-full border-8 border-[var(--color-primary)] flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl font-bold">{timer}</span>
            </div>
            <p className="text-xl">Hold the items in your memory...</p>
          </div>
        )}

        {/* Recalling Phase */}
        {phase === 'recalling' && (
          <div className="text-center">
            <p className="text-xl mb-6">
              Now speak the items you remember!
            </p>

            <div className="mb-6">
              <div className={'w-20 h-20 rounded-full flex items-center justify-center mx-auto ' + (isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400')}>
                <span className="text-3xl">🎤</span>
              </div>
              <p className={isListening ? 'text-red-600 font-bold mt-2' : 'text-gray-600 mt-2'}>
                {isListening ? 'Listening...' : 'Microphone ready'}
              </p>
            </div>

            {transcript && (
              <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                <p className="font-medium text-gray-700">You said:</p>
                <p className="text-lg">{transcript}</p>
              </div>
            )}

            <button
              onClick={submitRecall}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              Done - Check My Answers
            </button>
          </div>
        )}

        {/* Feedback Phase */}
        {phase === 'feedback' && (
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6">Results</h3>

            {/* Show what was heard */}
            {transcript && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-left">
                <p className="text-sm text-blue-700 font-medium">What the app heard:</p>
                <p className="text-blue-900">{transcript}</p>
              </div>
            )}

            <div className="space-y-3 mb-8">
              {matches.map((m, i) => (
                <div
                  key={i}
                  className={'p-4 rounded-lg ' + (m.isCorrect ? 'bg-green-100' : 'bg-red-100')}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize">{m.target}</span>
                    <span className={m.isCorrect ? 'text-green-600' : 'text-red-600'}>
                      {m.isCorrect ? 'Correct!' : 'Missed'}
                    </span>
                  </div>
                  {m.spoken && (
                    <div className="text-sm text-gray-600 mt-1">
                      Matched: &quot;{m.spoken}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-3xl font-bold mb-6">
              {matches.filter(m => m.isCorrect).length} / {matches.length} correct
            </div>

            <button
              onClick={nextTrial}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              {trialNumber >= 10 ? 'Finish Session' : 'Next Item'}
            </button>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={'w-3 h-3 rounded-full ' + (
                i < trialNumber - 1 ? 'bg-green-500' :
                i === trialNumber - 1 ? 'bg-[var(--color-primary)]' :
                'bg-gray-300'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
