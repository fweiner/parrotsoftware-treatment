'use client'

interface SessionProgressProps {
  current: number
  total: number
}

export default function SessionProgress({ current, total }: SessionProgressProps) {
  const percentage = (current / total) * 100

  return (
    <div className="w-full mb-6" style={{ maxWidth: '330px' }}>
      <div className="flex justify-between mb-2 text-lg">
        <span className="font-bold">Progress</span>
        <span className="font-bold text-2xl">
          {current} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300 flex items-center justify-center text-white font-semibold"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          {Math.round(percentage)}%
        </div>
      </div>
    </div>
  )
}
