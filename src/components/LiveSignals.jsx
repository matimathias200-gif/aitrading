import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/customSupabaseClient';

export default function LiveSignals({ isPremium }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchSignals();

    // Real-time subscription
    const channel = supabase
      .channel('crypto_signals_live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crypto_signals'
      }, (payload) => {
        console.log('Signal update:', payload);
        fetchSignals();
        setLastUpdate(new Date());
      })
      .subscribe();

    // Refresh every 15 seconds
    const interval = setInterval(() => {
      fetchSignals();
      setLastUpdate(new Date());
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(isPremium ? 20 : 3);

      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (type) => {
    switch (type) {
      case 'BUY': return 'from-green-500/20 to-green-500/5 border-green-500/30';
      case 'SELL': return 'from-red-500/20 to-red-500/5 border-red-500/30';
      default: return 'from-gray-500/20 to-gray-500/5 border-gray-500/30';
    }
  };

  const getSignalBadge = (type) => {
    switch (type) {
      case 'BUY':
        return <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          BUY
        </span>;
      case 'SELL':
        return <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
          <TrendingDown className="w-4 h-4" />
          SELL
        </span>;
      default:
        return <span className="px-3 py-1 bg-gray-600 text-white text-sm font-bold rounded-full">WAIT</span>;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <span className="ml-3 text-gray-400">Chargement des signaux...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold mb-1">Signaux en Temps Réel</h3>
          <p className="text-sm text-gray-400">
            Générés par notre IA propriétaire • Mise à jour toutes les 15 minutes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
          <button
            onClick={fetchSignals}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Last Update */}
      <div className="mb-4 text-xs text-gray-500 flex items-center gap-2">
        <Clock className="w-3 h-3" />
        Dernière mise à jour : {formatTime(lastUpdate)} ago
      </div>

      {/* Signals Grid */}
      <AnimatePresence mode="popLayout">
        {signals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Aucun signal actif pour le moment</p>
            <p className="text-sm text-gray-500 mt-2">
              L'IA analyse les marchés en continu
            </p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.map((signal, index) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gradient-to-br ${getSignalColor(signal.signal_type)} border rounded-xl p-5 hover:scale-105 transition-transform`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-bold">{signal.symbol}</h4>
                  {getSignalBadge(signal.signal_type)}
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Entrée</span>
                    <span className="font-semibold">${Number(signal.entry_price).toLocaleString()}</span>
                  </div>

                  {signal.take_profit && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Take Profit
                      </span>
                      <span className="font-semibold text-green-500">
                        ${Number(signal.take_profit).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {signal.stop_loss && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Stop Loss
                      </span>
                      <span className="font-semibold text-red-500">
                        ${Number(signal.stop_loss).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confidence & Time */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">Confiance IA</div>
                    <div className={`font-bold ${
                      signal.confidence >= 80 ? 'text-green-500' :
                      signal.confidence >= 60 ? 'text-yellow-500' :
                      'text-gray-500'
                    }`}>
                      {signal.confidence}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(signal.created_at)}
                  </div>
                </div>

                {/* Reason (if premium) */}
                {isPremium && signal.reason?.explain && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {signal.reason.explain}
                    </p>
                  </div>
                )}

                {/* Lock overlay for free users on signals 4+ */}
                {!isPremium && index >= 3 && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Premium Only</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Free Tier Message */}
      {!isPremium && signals.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg text-center">
          <p className="text-sm text-gray-400">
            Vous voyez {Math.min(signals.length, 3)} signaux sur {signals.length} disponibles.
            <span className="text-red-500 font-semibold ml-2">
              Passez à Premium pour tout débloquer.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
