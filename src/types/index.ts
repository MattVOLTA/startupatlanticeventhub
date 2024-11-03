export interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  url: string;
  capacity: number | null;
  status: string | null;
  currency: string | null;
  is_online: boolean;
  is_listed: boolean;
  is_shareable: boolean;
  is_invite_only: boolean;
  organizer_id: string | null;
  venue_id: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  format_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  logo_url: string | null;
  price: number | null;
  organization_id: string;
}

export interface Organization {
  id: string;
  name: string;
  eventbrite_id: string;
  created_at: string;
}