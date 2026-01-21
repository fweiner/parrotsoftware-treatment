/**
 * Life Words Settings Utility
 */

export interface LifeWordsSettings {
  voicePreference: 'female' | 'male'
  acceptableAlternatives: boolean
  partialMatching: boolean
  wordOverlap: boolean
  stopWordFiltering: boolean
  synonymMatching: boolean
  firstNameOnly: boolean
}

const DEFAULT_SETTINGS: LifeWordsSettings = {
  voicePreference: 'female',
  acceptableAlternatives: true,
  partialMatching: true,
  wordOverlap: true,
  stopWordFiltering: true,
  synonymMatching: true,
  firstNameOnly: true,
}

/**
 * Get settings from localStorage
 */
export function getSettings(): LifeWordsSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const saved = localStorage.getItem('lifeWordsSettings')
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }

  return DEFAULT_SETTINGS
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: Partial<LifeWordsSettings>): void {
  if (typeof window === 'undefined') return

  const current = getSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem('lifeWordsSettings', JSON.stringify(updated))
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our',
  'their', 'when', 'where', 'who', 'what', 'which', 'how', 'why',
  'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'just', 'like', 'so', 'very', 'really', 'um', 'uh'
])

// Common synonyms mapping
const SYNONYMS: Record<string, string[]> = {
  'dad': ['father', 'daddy', 'papa', 'pop', 'pa'],
  'father': ['dad', 'daddy', 'papa', 'pop', 'pa'],
  'mom': ['mother', 'mommy', 'mama', 'ma'],
  'mother': ['mom', 'mommy', 'mama', 'ma'],
  'grandma': ['grandmother', 'granny', 'nana', 'gran'],
  'grandmother': ['grandma', 'granny', 'nana', 'gran'],
  'grandpa': ['grandfather', 'gramps', 'granddad', 'papa'],
  'grandfather': ['grandpa', 'gramps', 'granddad', 'papa'],
  'wife': ['spouse', 'partner'],
  'husband': ['spouse', 'partner'],
  'kid': ['child', 'son', 'daughter'],
  'child': ['kid', 'son', 'daughter'],
  'home': ['house', 'residence', 'place'],
  'house': ['home', 'residence', 'place'],
  'nice': ['kind', 'friendly', 'good', 'sweet'],
  'kind': ['nice', 'friendly', 'good', 'sweet'],
  'happy': ['glad', 'joyful', 'cheerful'],
  'sad': ['unhappy', 'upset', 'down'],
  'big': ['large', 'huge', 'great'],
  'small': ['little', 'tiny', 'mini'],
  'old': ['elderly', 'senior', 'aged'],
  'young': ['youthful', 'junior'],
  'friend': ['buddy', 'pal', 'mate'],
  'brother': ['bro', 'sibling'],
  'sister': ['sis', 'sibling'],
  'doctor': ['dr', 'physician', 'doc'],
  'mister': ['mr'],
  'missus': ['mrs', 'ms'],
}

/**
 * Remove stop words from text
 */
function removeStopWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(word => !STOP_WORDS.has(word.toLowerCase()))
    .join(' ')
}

/**
 * Get synonyms for a word
 */
function getSynonyms(word: string): string[] {
  const lower = word.toLowerCase()
  return SYNONYMS[lower] || []
}

/**
 * Calculate word overlap percentage
 */
function calculateWordOverlap(answer: string, expected: string): number {
  const answerWords = new Set(answer.toLowerCase().split(/\s+/))
  const expectedWords = expected.toLowerCase().split(/\s+/)

  let matches = 0
  for (const word of expectedWords) {
    if (answerWords.has(word)) {
      matches++
    }
  }

  return expectedWords.length > 0 ? matches / expectedWords.length : 0
}

/**
 * Check if answer matches expected using configured settings
 */
export function matchAnswer(
  answer: string,
  expected: string,
  alternatives: string[] = [],
  settings?: LifeWordsSettings
): boolean {
  const config = settings || getSettings()

  // Normalize inputs (case-insensitive is always enabled)
  let normalizedAnswer = answer.toLowerCase().trim()
  let normalizedExpected = expected.toLowerCase().trim()

  // Apply stop word filtering
  if (config.stopWordFiltering) {
    normalizedAnswer = removeStopWords(normalizedAnswer)
    normalizedExpected = removeStopWords(normalizedExpected)
  }

  // Exact match (always checked)
  if (normalizedAnswer === normalizedExpected) {
    return true
  }

  // First name only matching
  if (config.firstNameOnly) {
    const firstName = normalizedExpected.split(' ')[0]
    if (normalizedAnswer === firstName) {
      return true
    }
    // Also check if answer is the first name from answer
    const answerFirstName = normalizedAnswer.split(' ')[0]
    if (answerFirstName === firstName) {
      return true
    }
  }

  // Acceptable alternatives (predefined alternatives like nicknames)
  if (config.acceptableAlternatives && alternatives.length > 0) {
    for (const alt of alternatives) {
      if (normalizedAnswer === alt.toLowerCase().trim()) {
        return true
      }
    }
  }

  // Partial matching (contains)
  if (config.partialMatching) {
    if (normalizedAnswer.includes(normalizedExpected)) {
      return true
    }
    if (normalizedExpected.includes(normalizedAnswer) && normalizedAnswer.length >= 2) {
      return true
    }
  }

  // Word overlap matching (50% or more)
  if (config.wordOverlap) {
    const overlap = calculateWordOverlap(normalizedAnswer, normalizedExpected)
    if (overlap >= 0.5) {
      return true
    }
  }

  // Synonym matching
  if (config.synonymMatching) {
    const expectedWords = normalizedExpected.split(/\s+/)
    const answerWords = normalizedAnswer.split(/\s+/)

    // Check if any answer word is a synonym of any expected word
    for (const answerWord of answerWords) {
      for (const expectedWord of expectedWords) {
        if (answerWord === expectedWord) continue
        const synonyms = getSynonyms(expectedWord)
        if (synonyms.includes(answerWord)) {
          return true
        }
      }
    }
  }

  return false
}
