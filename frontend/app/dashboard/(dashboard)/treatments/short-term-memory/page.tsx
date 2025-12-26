export default function ShortTermMemoryPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-500">
          🧠 Short Term Memory
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Games and activities to strengthen your memory skills.
        </p>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-8xl mb-6">🚧</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Coming Soon</h2>
          <p className="text-xl text-gray-700 mb-6">
            This treatment is currently in development. Check back soon!
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
