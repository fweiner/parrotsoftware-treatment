export default function WordFindingPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-primary)]">
          📝 Word Finding Practice
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Use semantic cues to help recall and name objects shown in images.
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-6">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Integration Complete - Setup Required
          </h2>
          <p className="text-lg text-gray-700 mb-6">
            The Word Finding treatment has been integrated into the application!
            Before you can use it, the database migrations need to be run.
          </p>

          <div className="bg-white rounded-lg p-6 mb-6 text-left">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">
              What's Included:
            </h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-2xl">✓</span>
                <span><strong>90+ Images</strong> - Professional stimuli with cue data</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-2xl">✓</span>
                <span><strong>8-Level Cue System</strong> - Hierarchical prompts from encouragement to full answer</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-2xl">✓</span>
                <span><strong>Speech Recognition</strong> - Uses Web Speech API for hands-free interaction</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-2xl">✓</span>
                <span><strong>Timer Challenges</strong> - 30-second response window with progressive cues</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-2xl">✓</span>
                <span><strong>Progress Tracking</strong> - Track accuracy, cues used, and response times</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-2xl">✓</span>
                <span><strong>Backend API</strong> - Full REST API for session management</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6 text-left">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">
              Setup Required:
            </h3>
            <ol className="space-y-3 text-lg text-gray-700 list-decimal list-inside">
              <li>
                <strong>Run Database Migrations</strong> in Supabase SQL Editor:
                <ul className="ml-8 mt-2 space-y-1 text-base">
                  <li>• <code className="bg-gray-200 px-2 py-1 rounded">supabase/migrations/20250101000001_word_finding_schema.sql</code></li>
                  <li>• <code className="bg-gray-200 px-2 py-1 rounded">supabase/migrations/20250101000002_word_finding_data.sql</code></li>
                </ul>
              </li>
              <li><strong>Restart</strong> the frontend to clear the build cache</li>
              <li><strong>Return</strong> to this page and start a session!</li>
            </ol>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-left">
            <h3 className="text-2xl font-bold mb-3 text-gray-900">
              Documentation:
            </h3>
            <p className="text-lg text-gray-700 mb-2">
              For complete integration details, see:
            </p>
            <ul className="space-y-2 text-base text-gray-600">
              <li>• <code className="bg-gray-200 px-2 py-1 rounded">docs/WORD_FINDING_INTEGRATION.md</code></li>
              <li>• Original app: <code className="bg-gray-200 px-2 py-1 rounded">c:\dev\word_finding</code></li>
            </ul>
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            <a
              href="/dashboard"
              className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              ← Back to Dashboard
            </a>
            <a
              href="/dashboard/progress"
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-gray-600 focus:ring-offset-2"
            >
              View Progress →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
