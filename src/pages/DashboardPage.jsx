import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import LiveSignals from '../components/LiveSignals';
import Sidebar from '../components/Sidebar';
import ScanRecommendation from '../components/ScanRecommendation';
import MarketHeatmap from '../components/MarketHeatmap';
import AiControlPanel from '../components/AiControlPanel';
import LiveMarketTable from '../components/LiveMarketTable';
import SystemDiagnostics from '../components/SystemDiagnostics';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latestSignal, setLatestSignal] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [settings, setSettings] = useState({
    sensitivity_level: 5,
    notifications_enabled: true,
    risk_profile: 'agressif'
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
    fetchLatestSignal();
    fetchMarketData();
    fetchSettings();
  }, [user]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestSignal = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLatestSignal(data);
    } catch (error) {
      console.error('Error fetching latest signal:', error);
    }
  };

  const fetchMarketData = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_prices')
        .select('*')
        .order('change_24h', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMarketData(data || []);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          sensitivity_level: data.sensitivity_level || 5,
          notifications_enabled: data.notifications_enabled !== false,
          risk_profile: data.risk_profile || 'agressif'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar profile={profile} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  Dashboard Crypto
                </h1>
                <p className="text-gray-400">
                  L'IA analyse le marché et affiche les opportunités en temps réel.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold">Système Opérationnel</span>
                </div>
                <div className="text-sm text-gray-400">
                  <Wifi className="w-4 h-4 inline mr-1" />
                  Dernier signal: il y a 359m
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <ScanRecommendation signal={latestSignal} />

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MarketHeatmap marketData={marketData} />
              </div>
              <div>
                <AiControlPanel settings={settings} setSettings={setSettings} />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <LiveSignals isPremium={true} />
              </div>
              <div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">Derniers Signaux Détectés</h3>
                  <LiveSignalTimeline />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Marché en Direct
              </h3>
              <LiveMarketTable />
            </div>

            <div>
              <SystemDiagnostics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveSignalTimeline() {
  const [recentSignals, setRecentSignals] = useState([]);

  useEffect(() => {
    fetchRecentSignals();
    const interval = setInterval(fetchRecentSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentSignals = async () => {
    const { data } = await supabase
      .from('crypto_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setRecentSignals(data);
  };

  return (
    <div className="space-y-3">
      {recentSignals.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Aucun signal récent</p>
      ) : (
        recentSignals.map((signal) => (
          <motion.div
            key={signal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-all"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              signal.signal_type === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
            }`}>
              {signal.signal_type === 'BUY' ? '↑' : '↓'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">{signal.symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  signal.signal_type === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {signal.signal_type}
                </span>
              </div>
              <p className="text-xs text-gray-400">Confiance: {signal.confidence}%</p>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(signal.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
