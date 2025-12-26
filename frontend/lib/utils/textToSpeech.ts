/**
 * Text-to-speech utility using Web Speech API
 */

let synth: SpeechSynthesis | null = null

if (typeof window !== 'undefined') {
  synth = window.speechSynthesis
}

export interface SpeechOptions {
  rate?: number // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  lang?: string // Language code, default 'en-US'
  voice?: SpeechSynthesisVoice
}

/**
 * Checks if text-to-speech is supported
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Gets available voices
 */
export function getVoices(): SpeechSynthesisVoice[] {
  if (!synth) return []
  return synth.getVoices()
}

/**
 * Speaks text using text-to-speech
 */
export function speak(
  text: string,
  options: SpeechOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!synth) {
      reject(new Error('Speech synthesis not supported'))
      return
    }

    // Cancel any ongoing speech
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.rate = options.rate ?? 1
    utterance.pitch = options.pitch ?? 1
    utterance.volume = options.volume ?? 1
    utterance.lang = options.lang ?? 'en-US'

    if (options.voice) {
      utterance.voice = options.voice
    }

    utterance.onend = () => resolve()
    utterance.onerror = (error) => {
      // Extract error message from SpeechSynthesisErrorEvent
      const errorMessage = error.error
        ? `Speech synthesis error: ${error.error}`
        : 'Speech synthesis failed'
      reject(new Error(errorMessage))
    }

    synth.speak(utterance)
  })
}

/**
 * Stops any ongoing speech
 */
export function stopSpeaking(): void {
  if (synth) {
    synth.cancel()
  }
}

/**
 * Waits for voices to be loaded (browsers load them asynchronously)
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!synth) {
      resolve([])
      return
    }

    const voices = synth.getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }

    synth.onvoiceschanged = () => {
      resolve(synth!.getVoices())
    }
  })
}
