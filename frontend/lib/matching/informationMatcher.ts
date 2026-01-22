/**
 * Information matcher for personal information practice.
 * Handles matching phone numbers, dates, numbers, and text fields.
 */

// Word to number mapping for spoken numbers
const WORD_TO_NUMBER: Record<string, string> = {
  'zero': '0', 'oh': '0', 'o': '0',
  'one': '1', 'won': '1',
  'two': '2', 'to': '2', 'too': '2',
  'three': '3',
  'four': '4', 'for': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8', 'ate': '8',
  'nine': '9',
  'ten': '10',
  'eleven': '11',
  'twelve': '12',
  'thirteen': '13',
  'fourteen': '14',
  'fifteen': '15',
  'sixteen': '16',
  'seventeen': '17',
  'eighteen': '18',
  'nineteen': '19',
  'twenty': '20',
  'thirty': '30',
  'forty': '40',
  'fifty': '50',
  'sixty': '60',
  'seventy': '70',
  'eighty': '80',
  'ninety': '90',
  'hundred': '00',
}

// Month name variations
const MONTH_NAMES: Record<string, string> = {
  'january': 'january', 'jan': 'january',
  'february': 'february', 'feb': 'february',
  'march': 'march', 'mar': 'march',
  'april': 'april', 'apr': 'april',
  'may': 'may',
  'june': 'june', 'jun': 'june',
  'july': 'july', 'jul': 'july',
  'august': 'august', 'aug': 'august',
  'september': 'september', 'sept': 'september', 'sep': 'september',
  'october': 'october', 'oct': 'october',
  'november': 'november', 'nov': 'november',
  'december': 'december', 'dec': 'december',
}

/**
 * Normalizes a string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Extracts only digits from a string
 */
function extractDigits(str: string): string {
  return str.replace(/\D/g, '')
}

/**
 * Converts spoken words to digits (e.g., "five five five" -> "555")
 */
function convertSpokenToDigits(str: string): string {
  const words = normalize(str).split(/\s+/)
  let result = ''

  for (const word of words) {
    if (WORD_TO_NUMBER[word]) {
      result += WORD_TO_NUMBER[word]
    } else if (/^\d+$/.test(word)) {
      result += word
    }
  }

  return result
}

/**
 * Matches phone numbers by comparing digits only
 */
export function matchPhoneNumber(userAnswer: string, expected: string): boolean {
  if (!userAnswer || !expected) return false

  // Extract digits from expected
  const expectedDigits = extractDigits(expected)

  // Try direct digit extraction from user answer
  const userDigits = extractDigits(userAnswer)
  if (userDigits === expectedDigits) return true

  // Try converting spoken words to digits
  const spokenDigits = convertSpokenToDigits(userAnswer)
  if (spokenDigits === expectedDigits) return true

  // Combine: user might say "555" and "one two three four" -> "5551234"
  const combined = extractDigits(userAnswer) + convertSpokenToDigits(userAnswer.replace(/\d/g, ''))
  if (combined === expectedDigits) return true

  // Partial match: if they got at least the last 4 or 7 digits right
  if (userDigits.length >= 4 && expectedDigits.endsWith(userDigits)) return true
  if (spokenDigits.length >= 4 && expectedDigits.endsWith(spokenDigits)) return true

  return false
}

/**
 * Matches zip codes by comparing digits only
 */
export function matchZipCode(userAnswer: string, expected: string): boolean {
  if (!userAnswer || !expected) return false

  const expectedDigits = extractDigits(expected)
  const userDigits = extractDigits(userAnswer)
  const spokenDigits = convertSpokenToDigits(userAnswer)

  return userDigits === expectedDigits || spokenDigits === expectedDigits
}

/**
 * Matches number values (like number of children)
 */
export function matchNumber(userAnswer: string, expected: string): boolean {
  if (!userAnswer || !expected) return false

  const expectedNum = parseInt(expected, 10)
  if (isNaN(expectedNum)) return false

  // Try parsing user answer as number
  const userNum = parseInt(userAnswer, 10)
  if (!isNaN(userNum) && userNum === expectedNum) return true

  // Try converting spoken number
  const spokenDigits = convertSpokenToDigits(userAnswer)
  const spokenNum = parseInt(spokenDigits, 10)
  if (!isNaN(spokenNum) && spokenNum === expectedNum) return true

  // Check if the number word appears in the answer
  const normalizedUser = normalize(userAnswer)
  for (const [word, digit] of Object.entries(WORD_TO_NUMBER)) {
    if (normalizedUser.includes(word) && parseInt(digit, 10) === expectedNum) {
      return true
    }
  }

  return false
}

/**
 * Extracts month from a date string
 */
function extractMonth(dateStr: string): string | null {
  const normalized = normalize(dateStr)

  for (const [variant, month] of Object.entries(MONTH_NAMES)) {
    if (normalized.includes(variant)) {
      return month
    }
  }

  return null
}

/**
 * Extracts day number from a date string
 */
function extractDay(dateStr: string): string | null {
  // Try to find a day number (1-31)
  const dayMatch = dateStr.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/)
  if (dayMatch) {
    return dayMatch[1]
  }

  // Try spoken numbers
  const words = normalize(dateStr).split(/\s+/)
  for (const word of words) {
    if (WORD_TO_NUMBER[word]) {
      const num = parseInt(WORD_TO_NUMBER[word], 10)
      if (num >= 1 && num <= 31) {
        return String(num)
      }
    }
  }

  return null
}

/**
 * Matches dates (birthday format like "January 15")
 */
export function matchDate(userAnswer: string, expected: string): boolean {
  if (!userAnswer || !expected) return false

  // Direct match after normalization
  if (normalize(userAnswer) === normalize(expected)) return true

  // Extract month and day from both
  const expectedMonth = extractMonth(expected)
  const expectedDay = extractDay(expected)
  const userMonth = extractMonth(userAnswer)
  const userDay = extractDay(userAnswer)

  // If both have month and day, compare them
  if (expectedMonth && expectedDay && userMonth && userDay) {
    return expectedMonth === userMonth && expectedDay === userDay
  }

  // If just month matches, that's partial credit (accept it)
  if (expectedMonth && userMonth && expectedMonth === userMonth) {
    return true
  }

  return false
}

/**
 * Calculates similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalize(str1)
  const s2 = normalize(str2)

  if (s1 === s2) return 1

  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  if (union.size === 0) return 0
  return intersection.size / union.size
}

/**
 * Matches text fields with fuzzy matching
 */
export function matchText(userAnswer: string, expected: string, threshold: number = 0.7): boolean {
  if (!userAnswer || !expected) return false

  const normalizedUser = normalize(userAnswer)
  const normalizedExpected = normalize(expected)

  // Exact match
  if (normalizedUser === normalizedExpected) return true

  // User answer contains expected (or vice versa)
  if (normalizedUser.includes(normalizedExpected) || normalizedExpected.includes(normalizedUser)) {
    return true
  }

  // Fuzzy similarity
  const similarity = calculateSimilarity(userAnswer, expected)
  return similarity >= threshold
}

export interface InformationMatchResult {
  isCorrect: boolean
  confidence: number
}

/**
 * Main matcher function that routes to appropriate field-specific matcher
 */
export function matchInformationAnswer(
  userAnswer: string,
  expected: string,
  fieldName: string
): InformationMatchResult {
  if (!userAnswer || !expected) {
    return { isCorrect: false, confidence: 0 }
  }

  let isCorrect = false

  switch (fieldName) {
    case 'phone_number':
      isCorrect = matchPhoneNumber(userAnswer, expected)
      break
    case 'address_zip':
      isCorrect = matchZipCode(userAnswer, expected)
      break
    case 'number_of_children':
      isCorrect = matchNumber(userAnswer, expected)
      break
    case 'date_of_birth':
      isCorrect = matchDate(userAnswer, expected)
      break
    default:
      // Text-based fields: city, state, name, job, marital status, favorites, colors
      isCorrect = matchText(userAnswer, expected)
  }

  return {
    isCorrect,
    confidence: isCorrect ? 1 : calculateSimilarity(userAnswer, expected)
  }
}
