export interface Organization {
  id: string;
  name: string;
  eventbrite_id: string;
  created_at: string;
}

export interface Interest {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Event {
  id: string;
  eventbrite_id: string;
  name: string;
  description: string | null;
  summary: string | null;
  detailed_summary: string | null;
  start_date: string;
  end_date: string;
  organization_id: string;
  is_virtual: boolean;
  is_free: boolean;
  status: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  url: string;
  logo_url: string | null;
  organizations?: Organization;
  interests?: Interest[];
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      interests: {
        Row: Interest;
        Insert: Omit<Interest, 'id' | 'created_at'>;
        Update: Partial<Omit<Interest, 'id' | 'created_at'>>;
      };
      event_interests: {
        Row: {
          event_id: string;
          interest_id: string;
          created_at: string;
        };
        Insert: Omit<{
          event_id: string;
          interest_id: string;
          created_at?: string;
        }, 'created_at'>;
        Update: Partial<{
          event_id: string;
          interest_id: string;
          created_at?: string;
        }>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at'>;
        Update: Partial<Omit<Event, 'id' | 'created_at'>>;
      };
    };
  };
}</content>