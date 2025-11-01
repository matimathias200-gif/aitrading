import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Brain, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function AnalysisLivePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
    fetchSignals();
    fetchMarketData();
    fetchAnalysis();

    const interval = setInterval(() => {
      fetchSignals();
      fetchMarketData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignals = async () => {
    try {
      const { data } = await supabase
        .from('crypto_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      setSignals(data || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const fetchMarketData = async () => {
    try {
      const { data } = await supabase
        .from('crypto_prices')
        .select('*')
        .order('change_24h', { ascending: false })
        .limit(20);

      setMarketData(data || []);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const { data } = await supabase
        .from('api_cache')
        .select('response_data')
        .in('api_name', ['scan_market_btc', 'scan_market_eth'])
        .order('fetched_at', { ascending: false })
        .limit(2);

      if (data && data.length > 0) {
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de l'analyse...</p>
        </div>
      </div>
    );
  }

  const activeBuySignals = signals.filter(s => s.signal_type === 'BUY').length;
  const activeSellSignals = signals.filter(s => s.signal_type === 'SELL').length;
  const avgConfidence = signals.length > 0
    ? (signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length).toFixed(1)
    : 0;

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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
              Analyse en Direct
            </h1>
            <p className="text-gray-400">
              Analyse en temps réel des signaux et du marché par l'IA
            </p>
          </motion.div>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <span className="text-2xl font-bold text-green-500">{activeBuySignals}</span>
              </div>
              <p className="text-sm text-gray-400">Signaux BUY actifs</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <TrendingDown className="w-8 h-8 text-red-500" />
                <span className="text-2xl font-bold text-red-500">{activeSellSignals}</span>
              </div>
              <p className="text-sm text-gray-400">Signaux SELL actifs</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold text-blue-500">{avgConfidence}%</span>
              </div>
              <p className="text-sm text-gray-400">Confiance moyenne</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="w-8 h-8 text-purple-500" />
                <span className="text-2xl font-bold text-purple-500">{marketData.length}</span>
              </div>
              <p className="text-sm text-gray-400">Cryptos analysées</p>
            </motion.div>
          </div>

          {/* Active Signals */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-red-500" />
              Signaux Actifs
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {signals.length === 0 ? (
                <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun signal actif pour le moment</p>
                  <p className="text-xs text-gray-600 mt-2">L'IA analyse le marché en continu</p>
                </div>
              ) : (
                signals.map((signal) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-gray-900 border rounded-2xl p-6 hover:shadow-xl transition-all ${
                      signal.signal_type === 'BUY'
                        ? 'border-green-500/30 hover:border-green-500/50'
                        : 'border-red-500/30 hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{signal.symbol}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(signal.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        signal.signal_type === 'BUY'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {signal.signal_type}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Entrée</span>
                        <span className="font-bold">${signal.entry_price?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Take Profit</span>
                        <span className="font-bold text-green-500">${signal.take_profit?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Stop Loss</span>
                        <span className="font-bold text-red-500">${signal.stop_loss?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                        <span className="text-gray-400 text-sm">Confiance</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${signal.confidence >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${signal.confidence}%` }}
                            ></div>
                          </div>
                          <span className="font-bold">{signal.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    {signal.reason?.explain && (
                      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                        <p className="text-xs text-gray-400">{signal.reason.explain}</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Market Overview */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Vue du Marché</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Crypto</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Prix</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">24h</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {marketData.map((crypto, index) => (
                      <motion.tr
                        key={crypto.symbol || index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold">{crypto.symbol}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          ${crypto.price?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${
                            crypto.change_24h >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {crypto.change_24h >= 0 ? '+' : ''}{crypto.change_24h?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400">
                          ${(crypto.volume_24h / 1000000).toFixed(2)}M
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
