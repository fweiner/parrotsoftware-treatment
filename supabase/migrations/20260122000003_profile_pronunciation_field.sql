-- Add pronunciation field to profiles table for full_name
-- This allows users to specify how their name should be pronounced by TTS

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name_pronunciation TEXT;

COMMENT ON COLUMN profiles.full_name_pronunciation IS 'How to pronounce the full name (e.g., "Wyner" for "Weiner"). Used by TTS in Information Practice.';
