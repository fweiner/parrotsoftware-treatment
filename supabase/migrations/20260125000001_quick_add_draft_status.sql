-- Add is_complete column to personal_contacts
ALTER TABLE personal_contacts
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE;

-- Add is_complete column to personal_items
ALTER TABLE personal_items
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE;

-- Create function to compute completeness for contacts
-- Contact is complete if name, relationship, and photo_url are all non-empty
CREATE OR REPLACE FUNCTION compute_contact_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_complete := (
    NEW.name IS NOT NULL AND
    NEW.name != '' AND
    NEW.relationship IS NOT NULL AND
    NEW.relationship != '' AND
    NEW.photo_url IS NOT NULL AND
    NEW.photo_url != ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to compute completeness for items
-- Item is complete if name and photo_url are both non-empty
CREATE OR REPLACE FUNCTION compute_item_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_complete := (
    NEW.name IS NOT NULL AND
    NEW.name != '' AND
    NEW.photo_url IS NOT NULL AND
    NEW.photo_url != ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_contact_completeness ON personal_contacts;
DROP TRIGGER IF EXISTS trigger_item_completeness ON personal_items;

-- Add triggers to auto-compute completeness on insert/update
CREATE TRIGGER trigger_contact_completeness
  BEFORE INSERT OR UPDATE ON personal_contacts
  FOR EACH ROW EXECUTE FUNCTION compute_contact_completeness();

CREATE TRIGGER trigger_item_completeness
  BEFORE INSERT OR UPDATE ON personal_items
  FOR EACH ROW EXECUTE FUNCTION compute_item_completeness();

-- Add indexes for efficient filtering by complete status
CREATE INDEX IF NOT EXISTS idx_personal_contacts_complete
  ON personal_contacts(user_id, is_active, is_complete);

CREATE INDEX IF NOT EXISTS idx_personal_items_complete
  ON personal_items(user_id, is_active, is_complete);

-- Update existing records to set is_complete based on current data
UPDATE personal_contacts
SET is_complete = (
  name IS NOT NULL AND name != '' AND
  relationship IS NOT NULL AND relationship != '' AND
  photo_url IS NOT NULL AND photo_url != ''
);

UPDATE personal_items
SET is_complete = (
  name IS NOT NULL AND name != '' AND
  photo_url IS NOT NULL AND photo_url != ''
);
