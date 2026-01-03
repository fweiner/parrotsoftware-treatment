'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function SettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [voiceGender, setVoiceGender] = useState<'male' | 'female' | 'neutral'>('female')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Get user email from auth
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
      }

      // Get profile from API
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const profile = await response.json()
        setFullName(profile.full_name || '')
        setVoiceGender(profile.voice_gender || 'female')
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ full_name: fullName, voice_gender: voiceGender })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update profile')
      }

      setSuccess('Profile updated successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-[var(--color-primary)] hover:text-[var(--color-accent)] font-medium text-lg"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-[var(--color-primary)]">
        Profile Settings
      </h1>

      {error && (
        <div
          className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-800"
          role="alert"
        >
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-green-800"
          role="alert"
        >
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        <div>
          <label
            htmlFor="email"
            className="block text-lg font-medium mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
          />
          <p className="mt-2 text-sm text-gray-500">
            Email cannot be changed
          </p>
        </div>

        <div>
          <label
            htmlFor="fullName"
            className="block text-lg font-medium mb-2"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            placeholder="Your full name"
          />
          <p className="mt-2 text-sm text-gray-500">
            This name is used when sending invites to contacts
          </p>
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">
            Voice Preference
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Choose the voice used when the app speaks to you
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className={`flex items-center justify-center px-6 py-4 border-2 rounded-lg cursor-pointer transition-colors ${voiceGender === 'female' ? 'border-[var(--color-primary)] bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input
                type="radio"
                name="voiceGender"
                value="female"
                checked={voiceGender === 'female'}
                onChange={(e) => setVoiceGender(e.target.value as 'female')}
                className="sr-only"
              />
              <span className="text-2xl mr-3">👩</span>
              <span className="text-lg font-medium">Female Voice</span>
            </label>
            <label className={`flex items-center justify-center px-6 py-4 border-2 rounded-lg cursor-pointer transition-colors ${voiceGender === 'male' ? 'border-[var(--color-primary)] bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input
                type="radio"
                name="voiceGender"
                value="male"
                checked={voiceGender === 'male'}
                onChange={(e) => setVoiceGender(e.target.value as 'male')}
                className="sr-only"
              />
              <span className="text-2xl mr-3">👨</span>
              <span className="text-lg font-medium">Male Voice</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          style={{ minHeight: '44px' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
