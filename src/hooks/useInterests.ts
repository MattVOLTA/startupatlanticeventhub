import { useEffect, useState } from 'react';
import { Interest } from '../types/database';
import { supabase } from '../lib/supabase';

export function useInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchInterests() {
      try {
        const { data, error } = await supabase
          .from('interests')
          .select('*')
          .order('name');

        if (error) throw error;
        setInterests(data || []);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch interests'));
      } finally {
        setLoading(false);
      }
    }

    fetchInterests();
  }, []);

  return { interests, loading, error };
}