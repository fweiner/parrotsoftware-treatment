/**
 * Normalizes a string for comparison (lowercase, trim, remove punctuation)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Checks if two words are plural/singular variants
 */
function isPluralMatch(word1: string, word2: string): boolean {
  const w1 = normalize(word1)
  const w2 = normalize(word2)

  // Exact match after normalization
  if (w1 === w2) return true

  // Check plural forms
  const pluralForms = [
    { singular: w1, plural: w1 + 's' },
    { singular: w1, plural: w1 + 'es' },
    { singular: w1.slice(0, -1), plural: w1 }, // if w1 is plural
    { singular: w1.slice(0, -2), plural: w1 }, // if w1 ends in 'es'
  ]

  for (const form of pluralForms) {
    if (form.singular === w2 || form.plural === w2) {
      return true
    }
  }

  return false
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = normalize(str1)
  const s2 = normalize(str2)

  const matrix: number[][] = []

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
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

  return matrix[s2.length][s1.length]
}

interface Stimulus {
  id: number
  name: string
  alternatives: string[]
  [key: string]: any
}

/**
 * Checks if user answer matches the correct answer or any alternatives
 * Also checks if the answer word appears anywhere in the phrase
 */
export function matchAnswer(
  userAnswer: string,
  stimulus: Stimulus
): boolean {
  if (!userAnswer || !stimulus) {
    return false
  }

  const normalizedUser = normalize(userAnswer)
  const normalizedCorrect = normalize(stimulus.name)

  // Check if the correct answer appears as a whole word anywhere in the user's answer
  // This handles phrases like "I like pizza" where "pizza" is the answer
  const correctWordRegex = new RegExp(`\\b${normalizedCorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (correctWordRegex.test(userAnswer)) {
    return true
  }

  // Check alternatives as whole words in the phrase
  for (const alt of stimulus.alternatives || []) {
    const normalizedAlt = normalize(alt)
    const altWordRegex = new RegExp(`\\b${normalizedAlt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (altWordRegex.test(userAnswer)) {
      return true
    }
  }

  // Exact match
  if (normalizedUser === normalizedCorrect) {
    return true
  }

  // Check alternatives
  for (const alt of stimulus.alternatives || []) {
    if (normalizedUser === normalize(alt)) {
      return true
    }
  }

  // Plural/singular match
  if (isPluralMatch(normalizedUser, normalizedCorrect)) {
    return true
  }

  // Check alternatives for plural matches
  for (const alt of stimulus.alternatives || []) {
    if (isPluralMatch(normalizedUser, normalize(alt))) {
      return true
    }
  }

  // Fuzzy matching - allow small typos (distance <= 2 for short words, <= 3 for longer)
  const maxDistance = normalizedCorrect.length <= 5 ? 1 : 2
  const distance = levenshteinDistance(normalizedUser, normalizedCorrect)

  if (distance <= maxDistance && normalizedUser.length >= normalizedCorrect.length - 2) {
    return true
  }

  // Check alternatives with fuzzy matching
  for (const alt of stimulus.alternatives || []) {
    const altDistance = levenshteinDistance(normalizedUser, normalize(alt))
    const altMaxDistance = alt.length <= 5 ? 1 : 2

    if (altDistance <= altMaxDistance && normalizedUser.length >= alt.length - 2) {
      return true
    }
  }

  return false
}

/**
 * Extracts the most likely answer from speech recognition results
 * Handles phrases like "That's a broom", "It's a broom", "I like pizza", etc.
 */
export function extractAnswer(transcript: string): string {
  let cleaned = transcript.toLowerCase().trim()

  // Common patterns that indicate a phrase containing the answer
  // Examples: "That's a broom", "It's a broom", "That is a broom", "It is a broom", "This is a broom"
  const phrasePatterns = [
    /(?:that'?s|it'?s|this'?s|that is|it is|this is)\s+(?:a|an)\s+(.+)/i,
    /(?:that'?s|it'?s|this'?s|that is|it is|this is)\s+(.+)/i,
    /(?:it'?s|that'?s|this'?s)\s+(?:a|an)\s+(.+)/i,
    /(?:looks like|seems like|appears to be)\s+(?:a|an)?\s*(.+)/i,
    /(?:i think|i believe|i see)\s+(?:it'?s|that'?s|this'?s)?\s*(?:a|an)?\s*(.+)/i,
    // Patterns for "I like/want/love/need/have [word]"
    /(?:i\s+(?:like|want|love|need|have|see|know|remember|recognize))\s+(?:a|an|the)?\s*(.+)/i,
    // Patterns for "[word] is good/nice/cool/etc"
    /(.+?)\s+(?:is|looks|seems|appears)\s+(?:good|nice|cool|great|fine|okay|ok)/i,
  ]

  // Try to extract answer from common phrase patterns
  for (const pattern of phrasePatterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].trim()
      // Remove trailing punctuation and filler words
      const finalAnswer = extracted
        .replace(/[.,!?;:'"]+$/, '') // Remove trailing punctuation
        .trim()

      if (finalAnswer.length > 0) {
        return finalAnswer
      }
    }
  }

  // Remove common filler words (but keep "like" if it's part of "I like [word]" pattern)
  const fillers = ['um', 'uh', 'er', 'ah', 'you know', 'the', 'a', 'an']
  for (const filler of fillers) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    cleaned = cleaned.replace(regex, '')
  }

  // Get the last word or phrase (up to 3 words)
  const words = cleaned.split(/\s+/).filter(w => w.length > 0)

  if (words.length === 0) {
    return transcript.trim()
  }

  // Return last 1-3 words (most likely to be the answer)
  const lastWords = words.slice(-3).join(' ')
  return lastWords.trim() || transcript.trim()
}
