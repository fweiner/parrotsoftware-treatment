'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function SpeechEchoPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const supabase = createClient()

  const startRecording = async () => {
    try {
      setError('')
      setTranscribedText('')
      setAudioUrl('')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err: any) {
      setError('Failed to access microphone. Please ensure microphone permissions are granted.')
      console.error('Recording error:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError('')

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Create form data with audio
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      // Send to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/treatments/speech-echo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const result = await response.json()

      // Set transcribed text
      setTranscribedText(result.transcribed_text || '')

      // Convert base64 audio to URL
      if (result.audio_content) {
        const audioData = atob(result.audio_content)
        const audioArray = new Uint8Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i)
        }
        const blob = new Blob([audioArray], { type: 'audio/mp3' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Auto-play the audio
        setTimeout(() => {
          const audio = new Audio(url)
          audio.play()
        }, 500)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process recording')
      console.error('Processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const tryAgain = () => {
    setTranscribedText('')
    setAudioUrl('')
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-primary)]">
          🎤 Speech Echo
        </h1>
        <p className="text-xl text-gray-700">
          Record your voice and hear it played back to you. This exercise helps with speech clarity and listening skills.
        </p>
      </div>

      {/* Instructions */}
      {!transcribedText && !isRecording && !isProcessing && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-[var(--color-primary)]">
            How it works:
          </h2>
          <ol className="space-y-3 text-lg">
            <li className="flex items-start">
              <span className="font-bold text-[var(--color-primary)] mr-3">1.</span>
              <span>Click the "Start Recording" button below</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-[var(--color-primary)] mr-3">2.</span>
              <span>Speak clearly into your microphone (1-30 seconds)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-[var(--color-primary)] mr-3">3.</span>
              <span>Click "Stop Recording" when finished</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-[var(--color-primary)] mr-3">4.</span>
              <span>Wait while we process your recording</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-[var(--color-primary)] mr-3">5.</span>
              <span>Read what you said and listen to it played back</span>
            </li>
          </ol>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6" role="alert">
          <div className="flex items-start">
            <span className="text-3xl mr-4">⚠️</span>
            <div>
              <h3 className="text-xl font-bold text-red-800 mb-2">Error</h3>
              <p className="text-lg text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center space-y-6">
          {!isRecording && !isProcessing && !transcribedText && (
            <button
              onClick={startRecording}
              className="w-full md:w-auto bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              style={{ minHeight: '60px', minWidth: '250px' }}
            >
              🎤 Start Recording
            </button>
          )}

          {isRecording && (
            <div className="text-center space-y-6">
              <div className="animate-pulse">
                <div className="text-8xl mb-4">🔴</div>
                <p className="text-2xl font-bold text-red-600">Recording...</p>
                <p className="text-lg text-gray-600 mt-2">Speak clearly into your microphone</p>
              </div>
              <button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-red-600 focus:ring-offset-2"
                style={{ minHeight: '60px', minWidth: '250px' }}
              >
                ⏹️ Stop Recording
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="text-center space-y-4">
              <div className="text-8xl mb-4">⏳</div>
              <p className="text-2xl font-bold text-[var(--color-primary)]">Processing...</p>
              <p className="text-lg text-gray-600">Converting your speech to text and preparing playback</p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {transcribedText && (
        <div className="space-y-6">
          {/* Transcription */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-4 text-[var(--color-primary)]">
              What you said:
            </h2>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <p className="text-2xl text-gray-900 leading-relaxed">
                "{transcribedText}"
              </p>
            </div>
          </div>

          {/* Audio Playback */}
          {audioUrl && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold mb-4 text-[var(--color-primary)]">
                Listen to yourself:
              </h2>
              <div className="flex justify-center">
                <audio
                  controls
                  src={audioUrl}
                  className="w-full max-w-2xl"
                  style={{ height: '60px' }}
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            </div>
          )}

          {/* Try Again Button */}
          <div className="flex justify-center">
            <button
              onClick={tryAgain}
              className="bg-[var(--color-accent)] hover:bg-blue-400 text-white font-bold py-6 px-12 rounded-lg text-2xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-2"
              style={{ minHeight: '60px' }}
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
