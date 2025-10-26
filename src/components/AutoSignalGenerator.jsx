import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from './ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AutoSignalGenerator = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const generateSignals = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        const { data, error } = await supabase.functions.invoke('live-market-data-fetcher');

        if (error) {
          console.error('Error generating signals:', error);
          return;
        }

        if (data?.signals && data.signals.length > 0) {
          console.log(`Generated ${data.signals.length} new signals`);
        }
      } catch (error) {
        console.error('Failed to generate signals:', error);
      } finally {
        isRunningRef.current = false;
      }
    };

    generateSignals();

    intervalRef.current = setInterval(generateSignals, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, toast]);

  return null;
};

export default AutoSignalGenerator;
