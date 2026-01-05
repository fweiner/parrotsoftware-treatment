'use client'

import Link from 'next/link'

export default function HowItWorksPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-[var(--color-primary)]">
            How It Works
          </h1>
          <Link
            href="/dashboard/treatments/life-words"
            className="text-[var(--color-primary)] hover:underline text-lg"
          >
            ← Back
          </Link>
        </div>

        {/* Overview Section */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-3 text-gray-900">
            What is Life Words and Memory?
          </h2>
          <p className="text-lg text-gray-700">
            This tool helps you practice remembering the names of people, pets, and things
            that matter most to you. By using photos and personal information from your own life,
            the practice is more meaningful and effective than generic exercises.
          </p>
        </div>

        {/* Getting Started */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <span className="text-3xl mr-3">1️⃣</span>
            Getting Started
          </h2>
          <div className="bg-gray-50 rounded-lg p-6 ml-12">
            <p className="text-lg text-gray-700 mb-4">
              First, add photos and information about people in your life:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Photo:</strong> A clear picture of the person's face</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Name:</strong> Their full name and any nicknames you use</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Relationship:</strong> How they're connected to you (spouse, child, friend, etc.)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Details:</strong> Their personality, interests, where you usually see them</span>
              </li>
            </ul>
            <p className="text-gray-600 mt-4 italic">
              You need at least 2 contacts to start practicing.
            </p>
          </div>
        </div>

        {/* Name Practice */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <span className="text-3xl mr-3">2️⃣</span>
            Name Practice
          </h2>
          <div className="bg-green-50 rounded-lg p-6 ml-12">
            <p className="text-lg text-gray-700 mb-4">
              In Name Practice, you'll see a photo and say the person's name out loud:
            </p>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] font-bold mr-3">1.</span>
                <span>A photo appears on screen</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] font-bold mr-3">2.</span>
                <span>Click the microphone and say their name</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] font-bold mr-3">3.</span>
                <span>The app checks if you said the right name</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--color-primary)] font-bold mr-3">4.</span>
                <span>If you're stuck, request a hint based on their relationship or interests</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Question Practice */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <span className="text-3xl mr-3">3️⃣</span>
            Question Practice
          </h2>
          <div className="bg-purple-50 rounded-lg p-6 ml-12">
            <p className="text-lg text-gray-700 mb-4">
              In Question Practice, you'll answer questions about your contacts:
            </p>
            <div className="space-y-3 text-gray-700 mb-4">
              <p><strong>Types of questions:</strong></p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  <span>"What is Barbara's relationship to you?"</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  <span>"Where do you usually see Matthew?"</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  <span>"What does Sarah enjoy doing?"</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  <span>"How would you describe John's personality?"</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  <span>"Who is your grandson who loves baseball?"</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Hints and Cues */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <span className="text-3xl mr-3">💡</span>
            Hints When You're Stuck
          </h2>
          <div className="bg-amber-50 rounded-lg p-6 ml-12">
            <p className="text-lg text-gray-700 mb-4">
              If you answer incorrectly, the app provides helpful hints:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-amber-600 mr-2 mt-1">•</span>
                <span><strong>First hint:</strong> A contextual clue based on the question type</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 mr-2 mt-1">•</span>
                <span><strong>Second hint:</strong> Another helpful detail from their profile</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 mr-2 mt-1">•</span>
                <span><strong>After 2 hints:</strong> The correct answer is revealed</span>
              </li>
            </ul>
            <p className="text-gray-600 mt-4 italic">
              Hints use information you've entered about each person, like their personality,
              interests, or where you typically see them.
            </p>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <span className="text-3xl mr-3">📊</span>
            Tracking Your Progress
          </h2>
          <div className="bg-gray-50 rounded-lg p-6 ml-12">
            <p className="text-lg text-gray-700 mb-4">
              The Progress page shows how you're doing over time:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Accuracy:</strong> How often you answer correctly</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Response Time:</strong> How quickly you respond</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Speech Clarity:</strong> How clearly the app understands you</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">•</span>
                <span><strong>Session History:</strong> Your recent practice sessions</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Answer Matching Settings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
            <span className="text-3xl mr-3">⚙️</span>
            Answer Matching Settings
          </h2>
          <div className="bg-gray-50 rounded-lg p-6 ml-12">
            <p className="text-lg text-gray-700 mb-4">
              In Settings, you can adjust how strictly answers are checked:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-1">•</span>
                <span><strong>Synonym Matching:</strong> Accept similar words (e.g., "kind" for "nice")</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-1">•</span>
                <span><strong>Partial Matching:</strong> Accept partial answers</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-1">•</span>
                <span><strong>First Name Only:</strong> Accept just the first name for full names</span>
              </li>
            </ul>
            <p className="text-gray-600 mt-4 italic">
              Start with more accommodations enabled, then turn them off as recall improves.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Tips for Success
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div className="flex items-start">
              <span className="text-green-600 mr-2 text-xl">✓</span>
              <span>Practice in a quiet room for better speech recognition</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 text-xl">✓</span>
              <span>Speak clearly and at a natural pace</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 text-xl">✓</span>
              <span>Add detailed information about each contact for better hints</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 text-xl">✓</span>
              <span>Practice regularly - even a few minutes helps</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 text-xl">✓</span>
              <span>Use clear, well-lit photos for each contact</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 text-xl">✓</span>
              <span>Click "Done for now" when you need a break</span>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center pt-4">
          <Link
            href="/dashboard/treatments/life-words"
            className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            Start Practicing
          </Link>
        </div>
      </div>
    </div>
  )
}
