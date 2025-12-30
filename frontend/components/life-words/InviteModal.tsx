'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function InviteModal({ isOpen, onClose, onSuccess }: InviteModalProps) {
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Please log in to continue')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/life-words/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          custom_message: customMessage || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to send invite')
      }

      setSuccess(true)
      onSuccess?.()

      // Reset form after a delay and close
      setTimeout(() => {
        setRecipientName('')
        setRecipientEmail('')
        setCustomMessage('')
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setRecipientName('')
      setRecipientEmail('')
      setCustomMessage('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Invite Someone to Help
            </h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">&#x2709;</div>
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                Invite Sent!
              </h3>
              <p className="text-gray-600">
                We've sent an email to {recipientName} at {recipientEmail}.
                They'll receive instructions to add their photo and information.
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Send an email invitation to someone you know. They'll be able to add their
                photo and information directly, which will be added to your contacts list.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="recipientName" className="block text-lg font-semibold text-gray-700 mb-2">
                    Their Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g., Barbara Smith"
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="recipientEmail" className="block text-lg font-semibold text-gray-700 mb-2">
                    Their Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="recipientEmail"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g., barbara@email.com"
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="customMessage" className="block text-lg font-semibold text-gray-700 mb-2">
                    Personal Message (optional)
                  </label>
                  <textarea
                    id="customMessage"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal note to your invitation..."
                    rows={3}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This message will be included in the email
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <p className="text-red-700 font-semibold">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    {isLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
