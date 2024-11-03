import { useEffect, useState } from 'react';
import { Organization } from '../types/database';
import { supabase } from '../lib/supabase';

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('name');

        if (error) throw error;
        setOrganizations(data || []);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch organizations'));
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  return { organizations, loading, error };
}