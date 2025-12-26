/**
 * Returns a random positive feedback message for correct answers
 */
const POSITIVE_MESSAGES = [
  'Excellent!',
  'Great job!',
  'Perfect!',
  'Well done!',
  'That\'s right!',
  'Fantastic!',
  'You got it!',
  'Nice work!',
  'Wonderful!',
  'Outstanding!',
  'Superb!',
  'Brilliant!',
  'Amazing!',
  'Terrific!',
  'Excellent work!',
]

export function getRandomPositiveFeedback(): string {
  const index = Math.floor(Math.random() * POSITIVE_MESSAGES.length)
  return POSITIVE_MESSAGES[index]
}
