/**
 * Text-to-speech utility using Amazon Polly via backend API
 */

export type VoiceGender = 'male' | 'female' | 'neutral'

export interface SpeechOptions {
  rate?: number // Not used with Polly, kept for interface compatibility
  pitch?: number // Not used with Polly, kept for interface compatibility
  volume?: number // 0 to 1, default 1
  lang?: string // Not used with Polly, kept for interface compatibility
  voice?: SpeechSynthesisVoice // Not used with Polly, kept for interface compatibility
  gender?: VoiceGender // Preferred voice gender
}

// Track current audio for stopping
let currentAudio: HTMLAudioElement | null = null

/**
 * Checks if text-to-speech is supported
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

/**
 * Gets available voices - returns empty array since Polly voices are server-side
 */
export function getVoices(): SpeechSynthesisVoice[] {
  return []
}

/**
 * Finds a voice matching the preferred gender - not used with Polly
 */
export function getVoiceByGender(
  gender: VoiceGender,
  lang: string = 'en-US'
): SpeechSynthesisVoice | null {
  return null
}

/**
 * Speaks text using Amazon Polly via backend API
 */
export async function speak(
  text: string,
  options: SpeechOptions = {}
): Promise<void> {
  if (!text || !text.trim()) {
    return
  }

  // Stop any ongoing speech
  stopSpeaking()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  try {
    const response = await fetch(`${apiUrl}/api/speech/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        gender: options.gender || 'neutral',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`TTS API error: ${response.status} - ${errorText}`)
    }

    // Get the audio blob
    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    // Play the audio
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl)
      currentAudio = audio

      // Set volume
      audio.volume = options.volume ?? 1

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        resolve()
      }

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        reject(new Error('Audio playback failed'))
      }

      audio.play().catch((error) => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        reject(new Error(`Failed to play audio: ${error.message}`))
      })
    })
  } catch (error) {
    console.error('TTS error:', error)
    throw error
  }
}

/**
 * Stops any ongoing speech
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

/**
 * Waits for voices to be loaded - returns immediately since Polly voices are server-side
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return Promise.resolve([])
}
