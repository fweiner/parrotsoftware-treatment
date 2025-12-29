-- Add personal characteristics fields to personal_contacts table
-- These fields help describe the person with aphasia's contacts in more detail

-- Add interests field - what does this person enjoy?
ALTER TABLE personal_contacts ADD COLUMN IF NOT EXISTS interests TEXT;

-- Add personality field - outgoing, reserved, optimistic, cautious, etc.
ALTER TABLE personal_contacts ADD COLUMN IF NOT EXISTS personality TEXT;

-- Add values field - what does this person value?
ALTER TABLE personal_contacts ADD COLUMN IF NOT EXISTS values TEXT;

-- Add social_behavior field - how does this person behave in social situations?
ALTER TABLE personal_contacts ADD COLUMN IF NOT EXISTS social_behavior TEXT;
