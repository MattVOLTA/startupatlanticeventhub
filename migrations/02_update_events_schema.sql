-- Update events table to match Eventbrite structure
ALTER TABLE events
  -- Drop existing columns that will be modified
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS image_url,
  DROP COLUMN IF EXISTS ticket_url,

  -- Add new columns from Eventbrite structure
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_invite_only BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS organizer_id TEXT,
  ADD COLUMN IF NOT EXISTS venue_id TEXT,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_address TEXT,
  ADD COLUMN IF NOT EXISTS venue_city TEXT,
  ADD COLUMN IF NOT EXISTS venue_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS venue_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS format_id TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS subcategory_id TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();