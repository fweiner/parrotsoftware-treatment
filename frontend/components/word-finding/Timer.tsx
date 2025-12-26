'use client'

interface TimerProps {
  seconds: number
}

export default function Timer({ seconds }: TimerProps) {
  const percentage = (seconds / 30) * 100
  const isLowTime = seconds <= 10

  return (
    <div className="w-full mb-6" style={{ maxWidth: '330px' }}>
      <div className="flex justify-between mb-2 text-lg">
        <span className="font-bold">Time Remaining</span>
        <span className={`font-bold text-2xl ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
          {seconds}s
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isLowTime ? 'bg-red-500' : 'bg-[var(--color-primary)]'
          }`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={seconds}
          aria-valuemin={0}
          aria-valuemax={30}
        />
      </div>
    </div>
  )
}
