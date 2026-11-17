'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeTable<T>(
  tableName: string,
  initialData: T[] = [],
  primaryKey: keyof T = 'id' as keyof T
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);

  // 1. Initial Fetch
  const fetchData = useCallback(async () => {
    try {
      const { data: fetchedData, error } = await supabase
        .from(tableName)
        .select('*')
        .order(String(primaryKey), { ascending: true });

      if (!error && fetchedData) {
        setData(fetchedData as T[]);
      }
    } catch (err) {
      console.error(`Error fetching table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName, primaryKey]);

  // 2. Realtime Subscription Setup
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          // Instant Local State Invalidation & Re-fetch
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, fetchData]);

  return { data, setData, loading, refetch: fetchData };
}