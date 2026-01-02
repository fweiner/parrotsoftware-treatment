'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import SpeechRecognitionButton from '@/components/word-finding/SpeechRecognitionButton'
import { speak, waitForVoices } from '@/lib/utils/textToSpeech'
import { getRandomPositiveFeedback } from '@/lib/utils/positiveFeedback'

interface PersonalContact {
  id: string
  name: string
  nickname?: string
  relationship: string
  photo_url: string
  interests?: string
  personality?: string
  location_context?: string
  association?: string
}

interface GeneratedQuestion {
  contact_id: string
  contact_name: string
  contact_photo_url: string
  question_type: number
  question_text: string
  expected_answer: string
  acceptable_answers: string[]
}

interface QuestionSession {
  id: string
  user_id: string
  contact_ids: string[]
  is_completed: boolean
  total_questions: number
  total_correct: number
}

interface QuestionResponse {
  question_type: number
  is_correct: boolean
  is_partial: boolean
  response_time: number
  correctness_score: number
}

// Session phases
type SessionPhase = 'study' | 'quiz' | 'completed'

// Question type names for display
const QUESTION_TYPE_NAMES: Record<number, string> = {
  1: 'Relationship',
  2: 'Association',
  3: 'Interests',
  4: 'Personality',
  5: 'Name Recall'
}

// Evaluate user answer against expected
function evaluateAnswer(
  userAnswer: string,
  expected: string,
  acceptable: string[]
): { isCorrect: boolean; isPartial: boolean; score: number } {
  if (!userAnswer) {
    return { isCorrect: false, isPartial: false, score: 0 }
  }

  const userLower = userAnswer.toLowerCase().trim()
  const expectedLower = expected.toLowerCase().trim()

  // Exact match
  if (userLower === expectedLower) {
    return { isCorrect: true, isPartial: false, score: 1.0 }
  }

  // Check acceptable alternatives
  for (const alt of acceptable) {
    if (alt && userLower === alt.toLowerCase()) {
      return { isCorrect: true, isPartial: false, score: 1.0 }
    }
  }

  // Partial match - user answer contains expected or vice versa
  if (expectedLower.includes(userLower) || userLower.includes(expectedLower)) {
    return { isCorrect: true, isPartial: true, score: 0.8 }
  }

  // Check if any word matches
  const userWords = new Set(userLower.split(/\s+/))
  const expectedWords = new Set(expectedLower.split(/\s+/))
  const common = [...userWords].filter(w => expectedWords.has(w))

  if (common.length > 0) {
    const score = common.length / Math.max(userWords.size, expectedWords.size)
    return { isCorrect: score >= 0.5, isPartial: true, score }
  }

  return { isCorrect: false, isPartial: false, score: 0 }
}

export default function LifeWordsQuestionSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  // Session state
  const [session, setSession] = useState<QuestionSession | null>(null)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [contacts, setContacts] = useState<PersonalContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Phase state
  const [phase, setPhase] = useState<SessionPhase>('study')
  const [studyIndex, setStudyIndex] = useState(0)

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean
    isPartial: boolean
    userAnswer: string
    expectedAnswer: string
  } | null>(null)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [statistics, setStatistics] = useState<any>(null)

  // Refs for async callbacks
  const isProcessingAnswerRef = useRef(false)
  const currentQuestionRef = useRef<GeneratedQuestion | null>(null)
  const currentIndexRef = useRef(0)
  const questionStartTimeRef = useRef(0)

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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/life-words/question-sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load session')
      }

      const sessionData = await response.json()
      setSession(sessionData.session as QuestionSession)
      setContacts(sessionData.contacts as PersonalContact[])

      // If session has existing responses, this is a resumed session - skip to quiz
      if (sessionData.responses && sessionData.responses.length > 0) {
        setResponses(sessionData.responses)
      }

      // Generate questions from contacts
      const questionsResponse = await regenerateQuestions(
        sessionData.contacts,
        authSession.access_token
      )

      if (questionsResponse && questionsResponse.length > 0) {
        setQuestions(questionsResponse)
        // Start in study phase
        setPhase('study')
        setStudyIndex(0)
      }

      setLoading(false)
    } catch (err: any) {
      console.error('Session initialization error:', err)
      setError(`Failed to initialize session: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  const regenerateQuestions = async (
    contactList: PersonalContact[],
    token: string
  ): Promise<GeneratedQuestion[]> => {
    const generated: GeneratedQuestion[] = []

    if (contactList.length < 2) return generated

    const shuffled = [...contactList].sort(() => Math.random() - 0.5)
    const c1 = shuffled[0]
    const c2 = shuffled[1] || shuffled[0]

    // Question 1: Relationship
    generated.push({
      contact_id: c1.id,
      contact_name: c1.name,
      contact_photo_url: c1.photo_url,
      question_type: 1,
      question_text: `What is ${c1.name}'s relationship to you?`,
      expected_answer: c1.relationship,
      acceptable_answers: [c1.relationship.toLowerCase(), c1.relationship]
    })

    // Question 2: Association
    const location = c2.location_context || c2.association || 'at home'
    generated.push({
      contact_id: c2.id,
      contact_name: c2.name,
      contact_photo_url: c2.photo_url,
      question_type: 2,
      question_text: `Where do you usually see ${c2.name}?`,
      expected_answer: location,
      acceptable_answers: [location.toLowerCase()]
    })

    // Question 3: Interests
    const interests = c1.interests || 'spending time together'
    generated.push({
      contact_id: c1.id,
      contact_name: c1.name,
      contact_photo_url: c1.photo_url,
      question_type: 3,
      question_text: `What does ${c1.name} enjoy doing?`,
      expected_answer: interests,
      acceptable_answers: [interests.toLowerCase()]
    })

    // Question 4: Personality
    const personality = c2.personality || 'kind and caring'
    generated.push({
      contact_id: c2.id,
      contact_name: c2.name,
      contact_photo_url: c2.photo_url,
      question_type: 4,
      question_text: `How would you describe ${c2.name}'s personality?`,
      expected_answer: personality,
      acceptable_answers: [personality.toLowerCase()]
    })

    // Question 5: Name from description
    const hint = c1.interests || c1.personality || 'is special to you'
    generated.push({
      contact_id: c1.id,
      contact_name: c1.name,
      contact_photo_url: c1.photo_url,
      question_type: 5,
      question_text: `Who is your ${c1.relationship} who ${hint}?`,
      expected_answer: c1.name,
      acceptable_answers: [
        c1.name.toLowerCase(),
        c1.name.split(' ')[0].toLowerCase(),
        c1.nickname?.toLowerCase() || ''
      ].filter(Boolean)
    })

    return generated
  }

  // ==================== STUDY PHASE ====================

  const handleStudyNext = async () => {
    if (studyIndex < questions.length - 1) {
      const nextIndex = studyIndex + 1
      setStudyIndex(nextIndex)

      // Speak the next answer
      const nextQ = questions[nextIndex]
      try {
        await speak(`${nextQ.question_text} The answer is: ${nextQ.expected_answer}`)
      } catch (e) {
        console.warn('TTS failed:', e)
      }
    } else {
      // Done with study phase, start quiz
      startQuizPhase()
    }
  }

  const startQuizPhase = async () => {
    setPhase('quiz')
    setCurrentIndex(0)
    currentIndexRef.current = 0

    const firstQuestion = questions[0]
    setCurrentQuestion(firstQuestion)
    currentQuestionRef.current = firstQuestion
    setIsAnswering(true)

    const startTime = Date.now()
    setQuestionStartTime(startTime)
    questionStartTimeRef.current = startTime

    try {
      await speak("Now let's see what you remember. " + firstQuestion.question_text)
    } catch (e) {
      console.warn('TTS failed:', e)
    }
  }

  // Speak study item when it changes
  useEffect(() => {
    if (phase === 'study' && questions.length > 0 && studyIndex === 0) {
      const speakFirst = async () => {
        try {
          await waitForVoices()
          const q = questions[0]
          await speak(`${q.question_text} The answer is: ${q.expected_answer}`)
        } catch (e) {
          console.warn('TTS failed:', e)
        }
      }
      speakFirst()
    }
  }, [phase, questions])

  // ==================== QUIZ PHASE ====================

  const handleAnswer = async (transcript: string) => {
    const currentQ = currentQuestionRef.current
    const isProcessing = isProcessingAnswerRef.current
    const startTime = questionStartTimeRef.current

    if (!currentQ || !session || isProcessing) {
      return
    }

    setIsProcessingAnswer(true)
    isProcessingAnswerRef.current = true

    try {
      const responseTime = Date.now() - startTime
      const evaluation = evaluateAnswer(
        transcript,
        currentQ.expected_answer,
        currentQ.acceptable_answers
      )

      // Save response
      await saveResponse(currentQ, transcript, evaluation, responseTime)

      // Show feedback
      setLastResult({
        isCorrect: evaluation.isCorrect,
        isPartial: evaluation.isPartial,
        userAnswer: transcript,
        expectedAnswer: currentQ.expected_answer
      })
      setShowFeedback(true)
      setIsAnswering(false)

      // Speak feedback
      if (evaluation.isCorrect) {
        const feedback = getRandomPositiveFeedback()
        await speak(feedback)
      } else {
        await speak(`The answer was ${currentQ.expected_answer}`)
      }

      // Move to next after delay
      setTimeout(() => {
        setShowFeedback(false)
        moveToNext()
      }, 3000)
    } catch (err) {
      console.error('Error handling answer:', err)
      setIsProcessingAnswer(false)
      isProcessingAnswerRef.current = false
    }
  }

  const saveResponse = async (
    question: GeneratedQuestion,
    userAnswer: string,
    evaluation: { isCorrect: boolean; isPartial: boolean; score: number },
    responseTime: number
  ) => {
    if (!session) return

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/life-words/question-sessions/${session.id}/responses`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact_id: question.contact_id,
            question_type: question.question_type,
            question_text: question.question_text,
            expected_answer: question.expected_answer,
            user_answer: userAnswer,
            is_correct: evaluation.isCorrect,
            is_partial: evaluation.isPartial,
            response_time: responseTime,
            clarity_score: 0.8,
            correctness_score: evaluation.score,
          }),
        }
      )

      // Track locally
      setResponses(prev => [...prev, {
        question_type: question.question_type,
        is_correct: evaluation.isCorrect,
        is_partial: evaluation.isPartial,
        response_time: responseTime,
        correctness_score: evaluation.score
      }])
    } catch (error) {
      console.error('Error saving response:', error)
    }
  }

  const moveToNext = async () => {
    const currentIdx = currentIndexRef.current
    const nextIndex = currentIdx + 1

    if (nextIndex >= questions.length) {
      completeSession()
      return
    }

    const nextQuestion = questions[nextIndex]

    currentIndexRef.current = nextIndex
    currentQuestionRef.current = nextQuestion
    isProcessingAnswerRef.current = false

    const startTime = Date.now()
    questionStartTimeRef.current = startTime

    setCurrentIndex(nextIndex)
    setCurrentQuestion(nextQuestion)
    setQuestionStartTime(startTime)
    setIsProcessingAnswer(false)
    setIsAnswering(true)

    try {
      await speak(nextQuestion.question_text)
    } catch (speakError: any) {
      console.warn('Text-to-speech failed:', speakError?.message || speakError)
    }
  }

  const completeSession = async () => {
    if (!session) return

    setPhase('completed')
    setIsAnswering(false)

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/life-words/question-sessions/${session.id}/complete`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Error completing session:', error)
    }
  }

  const handleDone = () => {
    router.push('/dashboard/treatments/life-words')
  }

  const handleSkip = () => {
    const currentQ = currentQuestionRef.current
    if (currentQ) {
      saveResponse(currentQ, '', { isCorrect: false, isPartial: false, score: 0 }, 0)
    }
    setShowFeedback(false)
    moveToNext()
  }

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Starting question session...</p>
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

  // ==================== STUDY PHASE UI ====================
  if (phase === 'study' && questions.length > 0) {
    const currentStudyQuestion = questions[studyIndex]
    const isLastStudyItem = studyIndex === questions.length - 1

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Phase indicator */}
        <div className="mb-6">
          <span className="bg-purple-100 text-purple-800 px-6 py-2 rounded-full text-xl font-semibold">
            Study Phase - Learn the Answers
          </span>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-6">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-colors ${
                idx < studyIndex
                  ? 'bg-purple-500'
                  : idx === studyIndex
                  ? 'bg-purple-600 ring-2 ring-purple-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Question type badge */}
        <div className="mb-4">
          <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-lg font-semibold">
            {QUESTION_TYPE_NAMES[currentStudyQuestion.question_type]}
          </span>
        </div>

        {/* Contact photo (not for question type 5) */}
        {currentStudyQuestion.question_type !== 5 && (
          <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-lg overflow-hidden shadow-lg mb-6 border-4 border-purple-200">
            <Image
              src={currentStudyQuestion.contact_photo_url}
              alt="Contact"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Question */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4 max-w-2xl">
          <p className="text-2xl md:text-3xl text-gray-800 text-center font-medium">
            {currentStudyQuestion.question_text}
          </p>
        </div>

        {/* Answer (highlighted) */}
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-8 max-w-2xl">
          <p className="text-lg text-green-700 text-center mb-2">The answer is:</p>
          <p className="text-3xl md:text-4xl text-green-800 text-center font-bold">
            {currentStudyQuestion.expected_answer}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={handleStudyNext}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-12 rounded-lg text-2xl transition-colors"
          >
            {isLastStudyItem ? "I'm Ready - Start Quiz" : 'Next'}
          </button>
        </div>

        {/* Skip to quiz */}
        <div className="mt-8">
          <button
            onClick={startQuizPhase}
            className="text-gray-500 hover:text-gray-700 underline text-lg"
          >
            Skip study - go straight to quiz
          </button>
        </div>

        {/* Done for now */}
        <div className="mt-4">
          <button
            onClick={handleDone}
            className="text-gray-500 hover:text-gray-700 underline text-lg"
          >
            Done for now
          </button>
        </div>
      </div>
    )
  }

  // ==================== COMPLETED PHASE UI ====================
  if (phase === 'completed') {
    const totalCorrect = responses.filter(r => r.is_correct).length
    const totalPartial = responses.filter(r => r.is_partial && !r.is_correct).length
    const avgResponseTime = responses.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.response_time, 0) / responses.length)
      : 0

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h2 className="text-4xl font-bold text-green-600 mb-6">Session Complete!</h2>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Your Results</h3>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-4xl font-bold text-green-600">{totalCorrect}</div>
                <div className="text-gray-600">Correct</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-4xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-gray-600">Total Questions</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-4xl font-bold text-amber-600">{totalPartial}</div>
                <div className="text-gray-600">Partial Correct</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-4xl font-bold text-purple-600">
                  {avgResponseTime > 0 ? `${(avgResponseTime / 1000).toFixed(1)}s` : '-'}
                </div>
                <div className="text-gray-600">Avg Response Time</div>
              </div>
            </div>

            <div className="text-left">
              <h4 className="text-lg font-bold mb-3 text-gray-900">By Question Type:</h4>
              <div className="space-y-2">
                {Object.entries(QUESTION_TYPE_NAMES).map(([type, name]) => {
                  const typeResponses = responses.filter(r => r.question_type === parseInt(type))
                  const typeCorrect = typeResponses.filter(r => r.is_correct).length
                  return (
                    <div key={type} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="text-gray-700">{name}</span>
                      <span className={`font-bold ${typeCorrect > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {typeCorrect}/{typeResponses.length}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

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

  // ==================== QUIZ PHASE UI ====================
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Phase indicator */}
      <div className="mb-6">
        <span className="bg-blue-100 text-blue-800 px-6 py-2 rounded-full text-xl font-semibold">
          Quiz Phase - Answer the Questions
        </span>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx < currentIndex
                ? responses[idx]?.is_correct
                  ? 'bg-green-500'
                  : 'bg-red-400'
                : idx === currentIndex
                ? 'bg-[var(--color-primary)]'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Question type badge */}
      {currentQuestion && (
        <div className="mb-4">
          <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-lg font-semibold">
            {QUESTION_TYPE_NAMES[currentQuestion.question_type]}
          </span>
        </div>
      )}

      {currentQuestion && (
        <>
          {/* Contact photo for visual context (not for Question 5 - name recall) */}
          {currentQuestion.question_type !== 5 && (
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-lg overflow-hidden shadow-lg mb-6 border-4 border-gray-200">
              <Image
                src={currentQuestion.contact_photo_url}
                alt="Contact"
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Question text */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 max-w-2xl">
            <p className="text-2xl md:text-3xl text-gray-800 text-center font-medium">
              {currentQuestion.question_text}
            </p>
          </div>

          {/* Feedback display */}
          {showFeedback && lastResult && (
            <div
              className={`rounded-lg p-6 mb-6 max-w-xl ${
                lastResult.isCorrect
                  ? 'bg-green-50 border-2 border-green-300'
                  : 'bg-amber-50 border-2 border-amber-300'
              }`}
            >
              <div className="text-center">
                {lastResult.isCorrect ? (
                  <div className="text-green-700">
                    <span className="text-4xl mb-2 block">✓</span>
                    <p className="text-xl font-bold">
                      {lastResult.isPartial ? 'Partial Match!' : 'Correct!'}
                    </p>
                    <p className="text-lg mt-2">You said: "{lastResult.userAnswer}"</p>
                  </div>
                ) : (
                  <div className="text-amber-800">
                    <span className="text-4xl mb-2 block">~</span>
                    <p className="text-xl font-bold">Not quite</p>
                    <p className="text-lg mt-2">You said: "{lastResult.userAnswer}"</p>
                    <p className="text-lg mt-1">
                      Answer: <span className="font-bold">{lastResult.expectedAnswer}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Speech input or waiting */}
          {isAnswering && !showFeedback ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg text-gray-600 mb-2">Take your time, then click the microphone to answer</p>
              <SpeechRecognitionButton
                key={`speech-${currentIndex}`}
                onResult={handleAnswer}
                disabled={isProcessingAnswer}
                resetTrigger={currentIndex}
                autoStart={false}
              />
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 underline text-lg"
              >
                Skip this question
              </button>
            </div>
          ) : !showFeedback && (
            <div className="text-center">
              <p className="text-xl text-gray-600">Processing...</p>
            </div>
          )}

          {/* Done button */}
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
