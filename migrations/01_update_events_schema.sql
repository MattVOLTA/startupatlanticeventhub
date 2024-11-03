-- Drop existing events table
DROP TABLE IF EXISTS events;

-- Create updated events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  capacity INTEGER,
  status TEXT,
  currency TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  is_listed BOOLEAN DEFAULT TRUE,
  is_shareable BOOLEAN DEFAULT TRUE,
  is_invite_only BOOLEAN DEFAULT FALSE,
  organizer_id TEXT,
  venue_id TEXT,
  venue_name TEXT,
  venue_address TEXT,
  venue_city TEXT,
  venue_latitude DOUBLE PRECISION,
  venue_longitude DOUBLE PRECISION,
  format_id TEXT,
  category_id TEXT,
  subcategory_id TEXT,
  logo_url TEXT,
  price DECIMAL(10,2),
  organization_id TEXT REFERENCES organizations(id),
  CONSTRAINT events_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE
);