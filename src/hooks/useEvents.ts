import { useEffect, useState, useMemo } from 'react';
import { Event } from '../types/database';
import { supabase } from '../lib/supabase';
import debounce from 'lodash/debounce';

interface FilterState {
  selectedOrgs: string[];
  selectedLocations: string[];
  selectedInterests: string[];
  selectedEventTypes: string[];
}

export function useEvents(
  selectedOrgs: string[],
  selectedLocations: string[],
  selectedInterests: string[] = [],
  selectedEventTypes: string[] = []
) {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all events once
  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            organizations!events_organization_id_fkey (
              id,
              name,
              eventbrite_id
            ),
            event_interests (
              interest_id,
              interests (
                id,
                name
              )
            )
          `)
          .eq('is_shareable', true)
          .gte('end_date', new Date().toISOString())
          .order('start_date');

        if (error) throw error;
        setAllEvents(data || []);
        setError(null);
      } catch (e) {
        console.error('Error fetching events:', e);
        setError(e instanceof Error ? e : new Error('Failed to fetch events'));
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Apply filters locally
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // Organization filter
      if (selectedOrgs.length > 0 && !selectedOrgs.includes('all')) {
        if (!event.organization_id || !selectedOrgs.includes(event.organization_id)) {
          return false;
        }
      }

      // Location filter
      if (selectedLocations.length > 0) {
        const isVirtual = event.is_online;
        const eventCity = event.venue_city;

        if (!selectedLocations.includes('Virtual') && isVirtual) {
          return false;
        }

        if (!isVirtual && !selectedLocations.includes(eventCity || '')) {
          return false;
        }
      }

      // Event Type filter
      if (selectedEventTypes.length > 0) {
        const isVirtual = selectedEventTypes.includes('Virtual');
        const isInPerson = selectedEventTypes.includes('In-Person');

        if (isVirtual && !isInPerson && !event.is_online) {
          return false;
        }
        if (!isVirtual && isInPerson && event.is_online) {
          return false;
        }
      }

      // Interest filter
      if (selectedInterests.length > 0) {
        const eventInterestIds = event.event_interests?.map(ei => ei.interest_id) || [];
        if (!selectedInterests.some(id => eventInterestIds.includes(id))) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, selectedOrgs, selectedLocations, selectedInterests, selectedEventTypes]);

  return { events: filteredEvents, loading, error };
}