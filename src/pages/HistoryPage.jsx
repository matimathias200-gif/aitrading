import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historicalSignals, setHistoricalSignals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    active: 0,
    winRate: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchProfile();
    fetchHistoricalSignals();
  }, [user, filter]);

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

  const fetchHistoricalSignals = async () => {
    try {
      let query = supabase
        .from('crypto_signals')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query.limit(100);

      if (data) {
        setHistoricalSignals(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching historical signals:', error);
    }
  };

  const calculateStats = (signals) => {
    const total = signals.length;
    const completed = signals.filter(s => s.status === 'completed').length;
    const failed = signals.filter(s => s.status === 'failed').length;
    const active = signals.filter(s => s.status === 'active').length;
    const winRate = completed + failed > 0 ? ((completed / (completed + failed)) * 100).toFixed(1) : 0;

    setStats({ total, completed, failed, active, winRate });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de l'historique...</p>
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
              Historique des Signaux
            </h1>
            <p className="text-gray-400">
              Consultez l'historique complet de vos signaux de trading
            </p>
          </motion.div>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <History className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <p className="text-xs text-gray-400">Total signaux</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold text-green-500">{stats.completed}</span>
              </div>
              <p className="text-xs text-gray-400">Réussis</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold text-red-500">{stats.failed}</span>
              </div>
              <p className="text-xs text-gray-400">Échoués</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-500">{stats.active}</span>
              </div>
              <p className="text-xs text-gray-400">En cours</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold text-purple-500">{stats.winRate}%</span>
              </div>
              <p className="text-xs text-gray-400">Taux de réussite</p>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              {['all', 'active', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === status
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {status === 'all' ? 'Tous' : status === 'active' ? 'Actifs' : status === 'completed' ? 'Réussis' : 'Échoués'}
                </button>
              ))}
            </div>
          </div>

          {/* Signals History Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Crypto</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Type</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Entrée</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">TP</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">SL</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Confiance</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {historicalSignals.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        Aucun signal trouvé pour ce filtre
                      </td>
                    </tr>
                  ) : (
                    historicalSignals.map((signal, index) => (
                      <motion.tr
                        key={signal.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(signal.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold">{signal.symbol}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            signal.signal_type === 'BUY'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {signal.signal_type === 'BUY' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {signal.signal_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm">
                          ${signal.entry_price?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-green-500">
                          ${signal.take_profit?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-red-500">
                          ${signal.stop_loss?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${signal.confidence >= 70 ? 'bg-green-500' : signal.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${signal.confidence}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold">{signal.confidence}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            signal.status === 'completed'
                              ? 'bg-green-500/20 text-green-500'
                              : signal.status === 'failed'
                              ? 'bg-red-500/20 text-red-500'
                              : signal.status === 'active'
                              ? 'bg-yellow-500/20 text-yellow-500'
                              : 'bg-gray-500/20 text-gray-500'
                          }`}>
                            {signal.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                            {signal.status === 'failed' && <XCircle className="w-3 h-3" />}
                            {signal.status === 'active' && <Clock className="w-3 h-3" />}
                            {signal.status === 'completed' ? 'Réussi' : signal.status === 'failed' ? 'Échoué' : signal.status === 'active' ? 'En cours' : signal.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
