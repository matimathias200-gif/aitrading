import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useSignals = (user) => {
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchSignals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('crypto_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setSignals(data || []);
    } catch (err) {
      console.error('Error fetching signals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();

    channelRef.current = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crypto_signals'
        },
        (payload) => {
          console.log('[Realtime] New signal received:', payload.new);
          setSignals((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crypto_signals'
        },
        (payload) => {
          console.log('[Realtime] Signal updated:', payload.new);
          setSignals((prev) =>
            prev.map((s) => (s.id === payload.new.id ? payload.new : s))
          );
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchSignals]);

  return { signals, isLoading, error, refetch: fetchSignals };
};
