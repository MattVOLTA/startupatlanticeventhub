-- Add detailed_summary column to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS detailed_summary TEXT;

-- Refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema');