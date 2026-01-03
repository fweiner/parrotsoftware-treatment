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
