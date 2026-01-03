'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { VoiceGender } from '@/lib/utils/textToSpeech'

/**
 * Hook to get and manage the user's voice preference
 * Returns the voice gender preference from the user's profile
 */
export function useVoicePreference(): VoiceGender {
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female')
  const supabase = createClient()

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const profile = await response.json()
          if (profile.voice_gender) {
            setVoiceGender(profile.voice_gender as VoiceGender)
          }
        }
      } catch (err) {
        console.error('Error loading voice preference:', err)
      }
    }

    loadPreference()
  }, [])

  return voiceGender
}
