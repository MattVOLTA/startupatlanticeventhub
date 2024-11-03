import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useLocations() {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        // Fetch all events with their venue cities and virtual status
        const { data, error } = await supabase
          .from('events')
          .select('venue_city, is_online')
          .not('venue_city', 'is', null);

        if (error) throw error;

        // Get unique cities and sort them
        const cities = [...new Set(data
          .map(event => event.venue_city)
          .filter((city): city is string => city !== null)
        )].sort();

        // Add 'Virtual' if there are any virtual events
        const hasVirtualEvents = data.some(event => event.is_online);
        const allLocations = hasVirtualEvents ? ['Virtual', ...cities] : cities;

        setLocations(allLocations);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch locations'));
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
  }, []);

  return { locations, loading, error };
}