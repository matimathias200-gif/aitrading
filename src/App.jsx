
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import CryptoDashboard from '@/components/CryptoDashboard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Zap } from 'lucide-react';
import MarketPage from '@/pages/MarketPage';
import SignalsPage from '@/pages/SignalsPage';
import TradeAnalysisPage from '@/pages/TradeAnalysisPage';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import PricingPage from '@/pages/PricingPage';
import LegalPage from '@/pages/LegalPage';
import AutoSignalGenerator from '@/components/AutoSignalGenerator';
import AnalysisLivePage from '@/pages/AnalysisLivePage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';

function App() {
  const [signals, setSignals] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({ sensitivity_level: 3, notifications_enabled: true, risk_profile: 'modéré' });
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('settings')
      .select('sensitivity_level, notifications_enabled, risk_profile, last_scan_at')
      .eq('user_id', userId)
      .single();

    if (data) {
      setSettings(prev => ({...prev, ...data}));
    } else if (error && error.code !== 'PGRST116') {
      console.error("Error fetching settings", error);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [signalsResult, marketDataResult] = await Promise.all([
        supabase.from('crypto_signals').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('crypto_market_data').select('*').order('volume_24h', { ascending: false })
      ]);

      if (signalsResult.error) throw new Error(`DB Signal Fetch Error: ${signalsResult.error.message}`);
      if (marketDataResult.error) throw new Error(`DB Market Data Fetch Error: ${marketDataResult.error.message}`);
      
      setSignals(signalsResult.data || []);
      setMarketData(marketDataResult.data || []);

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
  
  useEffect(() => {
    if (user) {
      fetchInitialData();
      fetchSettings(user.id);
    } else {
      setIsLoading(false);
      setSignals([]);
      setMarketData([]);
    }
  }, [user, fetchInitialData, fetchSettings]);

  useEffect(() => {
    if (!user) return;

    const notificationsEnabled = settings.notifications_enabled;

    const signalsChannel = supabase.channel('crypto_signals_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crypto_signals' }, (payload) => {
          const newSignal = payload.new;
          setSignals(currentSignals => [newSignal, ...currentSignals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

          if (notificationsEnabled) {
            toast({
                description: (
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${newSignal.signal_type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <Zap className={`w-5 h-5 ${newSignal.signal_type === 'BUY' ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <p className="font-bold">Nouveau Signal: {newSignal.signal_type} {newSignal.symbol}</p>
                      <p className="text-xs">Confiance: {newSignal.confidence}% | Entrée: ${newSignal.entry_price}</p>
                    </div>
                  </div>
                ),
                duration: 8000,
            });
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crypto_signals' }, (payload) => {
          setSignals(currentSignals => currentSignals.map(s => s.id === payload.new.id ? {...s, ...payload.new} : s));
      })
      .subscribe();

    const marketDataChannel = supabase.channel('crypto_market_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crypto_market_data' }, (payload) => {
          supabase.from('crypto_market_data').select('*').order('volume_24h', { ascending: false })
            .then(({ data }) => setMarketData(data || []));
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings', filter: `user_id=eq.${user.id}` }, (payload) => {
        setSettings(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
        supabase.removeChannel(signalsChannel);
        supabase.removeChannel(marketDataChannel);
        supabase.removeChannel(settingsChannel);
    };
  }, [user, toast]);
  
  const Layout = () => (
     <>
      <Header settings={settings} setSettings={setSettings}/>
      <main className="container mx-auto px-4 mt-8">
        <Outlet context={{ signals, marketData, isLoading, user, settings, setSettings }} />
      </main>
     </>
  );

  return (
    <>
      <Helmet>
        <title>CryptoSignalAI - Dashboard de Trading IA</title>
        <meta name="description" content="Plateforme d'analyse et de génération de signaux de trading pour les crypto-monnaies, pilotée par l'IA." />
      </Helmet>
      <div className="min-h-screen pb-8 bg-background text-foreground">
        <Routes>
            {/* PUBLIC ROUTES - Landing & Marketing */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/legal" element={<LegalPage />} />

            {/* PRIVATE ROUTES - Dashboard IA (Protected) */}
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/analysis" element={<AnalysisLivePage />} />
            <Route path="/app/history" element={<HistoryPage />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* OLD ROUTES - Compatibility (will be removed later) */}
            <Route path="/old" element={<Layout />}>
                <Route index element={
                    <CryptoDashboard
                      signals={signals}
                      marketData={marketData}
                      isLoading={isLoading}
                      user={user}
                      settings={settings}
                      setSettings={setSettings}
                    />
                } />
                <Route path="market" element={<MarketPage marketData={marketData} />} />
                <Route path="signals/active" element={<SignalsPage signals={signals.filter(s => s.status === 'active')} isLoading={isLoading} title="Signaux Actifs" />} />
                <Route path="analytics" element={<TradeAnalysisPage user={user} />} />
            </Route>
        </Routes>
        <Toaster />
      </div>
    </>
  );
}

export default App;
