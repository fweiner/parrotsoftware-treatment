/**
 * Text-to-speech utility using Web Speech API
 */

let synth: SpeechSynthesis | null = null

if (typeof window !== 'undefined') {
  synth = window.speechSynthesis
}

export type VoiceGender = 'male' | 'female' | 'neutral'

export interface SpeechOptions {
  rate?: number // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  lang?: string // Language code, default 'en-US'
  voice?: SpeechSynthesisVoice
  gender?: VoiceGender // Preferred voice gender
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
 * Finds a voice matching the preferred gender
 * Browser voices often have gender hints in their names
 */
export function getVoiceByGender(
  gender: VoiceGender,
  lang: string = 'en-US'
): SpeechSynthesisVoice | null {
  const voices = getVoices()
  if (voices.length === 0) return null

  // Filter to matching language first
  const langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]))
  const voicesToSearch = langVoices.length > 0 ? langVoices : voices

  // Common patterns for voice gender detection
  const femalePatterns = ['female', 'woman', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'kate', 'susan', 'zira', 'hazel', 'eva']
  const malePatterns = ['male', 'man', 'daniel', 'david', 'george', 'james', 'alex', 'fred', 'tom', 'mark', 'lee', 'guy']

  for (const voice of voicesToSearch) {
    const name = voice.name.toLowerCase()

    if (gender === 'female') {
      if (femalePatterns.some(p => name.includes(p))) {
        return voice
      }
    } else if (gender === 'male') {
      if (malePatterns.some(p => name.includes(p))) {
        return voice
      }
    }
  }

  // If no gender match, return the first English voice or first voice available
  const englishVoice = voicesToSearch.find(v => v.lang.startsWith('en'))
  return englishVoice || voicesToSearch[0] || null
}

/**
 * Speaks text using text-to-speech
 * Includes workaround for Chrome bug where onend doesn't fire
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

    // Set voice: explicit voice takes priority, then gender preference
    if (options.voice) {
      utterance.voice = options.voice
    } else if (options.gender) {
      const genderVoice = getVoiceByGender(options.gender, options.lang ?? 'en-US')
      if (genderVoice) {
        utterance.voice = genderVoice
      }
    }

    let resolved = false
    let speechStarted = false
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      resolved = true
      if (pollInterval) clearInterval(pollInterval)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
    }

    utterance.onstart = () => {
      speechStarted = true
    }

    utterance.onend = () => {
      if (!resolved) {
        cleanup()
        resolve()
      }
    }

    utterance.onerror = (error) => {
      if (!resolved) {
        cleanup()
        // Extract error message from SpeechSynthesisErrorEvent
        const errorMessage = error.error
          ? `Speech synthesis error: ${error.error}`
          : 'Speech synthesis failed'
        reject(new Error(errorMessage))
      }
    }

    synth.speak(utterance)

    // Chrome bug workaround: poll speaking state, but only after speech has started
    // Wait 500ms before polling to ensure speech has time to begin
    setTimeout(() => {
      if (resolved) return
      pollInterval = setInterval(() => {
        // Only check for completion if speech has started
        if (!resolved && speechStarted && synth && !synth.speaking && !synth.pending) {
          cleanup()
          resolve()
        }
      }, 100)
    }, 500)

    // Fallback timeout: estimate ~200ms per word + 3s buffer (more conservative)
    const wordCount = text.split(/\s+/).length
    const estimatedDuration = Math.max(wordCount * 200 + 3000, 5000)
    fallbackTimeout = setTimeout(() => {
      if (!resolved) {
        cleanup()
        resolve() // Resolve anyway after timeout
      }
    }, estimatedDuration)
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
