import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import CryptoDashboard from '../components/CryptoDashboard';
import { useToast } from '../components/ui/use-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [signals, setSignals] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    sensitivity_level: 3,
    notifications_enabled: true,
    risk_profile: 'modéré'
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
    fetchInitialData();
    fetchSettings(user.id);
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            plan: 'free',
            subscription_status: 'inactive'
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSettings = useCallback(async (userId) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('sensitivity_level, notifications_enabled, risk_profile, last_scan_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setSettings(prev => ({...prev, ...data}));
      } else if (error && error.code !== 'PGRST116') {
        console.error("Error fetching settings", error);
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [signalsResult, marketDataResult] = await Promise.all([
        supabase
          .from('crypto_signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('crypto_market_data')
          .select('*')
          .order('volume_24h', { ascending: false })
      ]);

      if (signalsResult.error) {
        console.error('Signals fetch error:', signalsResult.error);
      } else {
        setSignals(signalsResult.data || []);
      }

      if (marketDataResult.error) {
        console.error('Market data fetch error:', marketDataResult.error);
      } else {
        setMarketData(marketDataResult.data || []);
      }

    } catch (error) {
      console.error("Error during initial data fetch:", error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de récupérer les données initiales.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const notificationsEnabled = settings.notifications_enabled;

    const signalsChannel = supabase
      .channel('crypto_signals_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crypto_signals'
      }, (payload) => {
        console.log('[REALTIME] Signal update:', payload);

        if (payload.eventType === 'INSERT') {
          setSignals(prev => [payload.new, ...prev]);

          if (notificationsEnabled && payload.new.signal_type !== 'WAIT') {
            toast({
              title: `🔔 Nouveau signal ${payload.new.signal_type}`,
              description: `${payload.new.symbol} - Confiance: ${payload.new.confidence}%`,
              duration: 5000
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          setSignals(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
          setSignals(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const marketDataChannel = supabase
      .channel('crypto_market_data_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crypto_market_data'
      }, (payload) => {
        console.log('[REALTIME] Market data update:', payload);

        if (payload.eventType === 'INSERT') {
          setMarketData(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setMarketData(prev => prev.map(m => m.symbol === payload.new.symbol ? payload.new : m));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(marketDataChannel);
    };
  }, [user, settings.notifications_enabled, toast]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement du dashboard IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <Sidebar profile={profile} />

      {/* Main Content - Full IA Dashboard */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CryptoDashboard
            signals={signals}
            marketData={marketData}
            isLoading={isLoading}
            user={user}
            settings={settings}
            setSettings={setSettings}
          />
        </div>
      </div>
    </div>
  );
}
