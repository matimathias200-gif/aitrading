import { useEffect, useState } from 'react';
import { supabase } from '../lib/customSupabaseClient';
import { Bell, TrendingUp, TrendingDown, Clock, Target, Shield } from 'lucide-react';

/**
 * LiveSignalStream - Streaming temps réel des signaux
 * Utilise Supabase Realtime pour écouter les nouveaux signaux
 * Affiche une notification toast pour chaque nouveau signal
 */

export default function LiveSignalStream() {
  const [liveSignals, setLiveSignals] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);

  useEffect(() => {
    console.log('[LiveSignalStream] Initializing realtime subscription...');

    // Subscribe to INSERT events on crypto_signals table
    const channel = supabase
      .channel('signal-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crypto_signals',
          filter: 'symbol=eq.BTCUSDT'
        },
        (payload) => {
          console.log('[LiveSignalStream] New signal received:', payload.new);

          const newSignal = payload.new;

          // Ajouter au stream
          setLiveSignals((prev) => [newSignal, ...prev].slice(0, 10));
          setLastSignal(newSignal);

          // Notification toast
          showNotification(newSignal);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crypto_signals',
          filter: 'symbol=eq.BTCUSDT'
        },
        (payload) => {
          console.log('[LiveSignalStream] Signal updated:', payload.new);

          const updatedSignal = payload.new;

          // Mettre à jour dans le stream
          setLiveSignals((prev) =>
            prev.map((s) => (s.id === updatedSignal.id ? updatedSignal : s))
          );
        }
      )
      .subscribe((status) => {
        console.log('[LiveSignalStream] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Cleanup on unmount
    return () => {
      console.log('[LiveSignalStream] Unsubscribing...');
      supabase.removeChannel(channel);
    };
  }, []);

  const showNotification = (signal) => {
    // Browser notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = signal.signal_type === 'BUY' ? '🟢' : signal.signal_type === 'SELL' ? '🔴' : '⚪';
      new Notification(`${icon} Nouveau Signal BTC`, {
        body: `${signal.signal_type} @ ${signal.confidence}% | Entrée: ${parseFloat(signal.entry_price).toFixed(2)}`,
        icon: '/favicon.ico',
        tag: signal.id
      });
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isConnected ? 'Connecté au stream' : 'Déconnecté'}
          </span>
        </div>

        <button
          onClick={requestNotificationPermission}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Bell className="w-4 h-4" />
          Activer notifications
        </button>
      </div>

      {/* Last Signal Alert */}
      {lastSignal && (
        <div
          className={`p-4 rounded-lg border-2 ${
            lastSignal.signal_type === 'BUY'
              ? 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500'
              : lastSignal.signal_type === 'SELL'
              ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500'
              : 'bg-gray-50 border-gray-500 dark:bg-gray-800 dark:border-gray-500'
          } animate-pulse`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <span className="font-bold text-lg">Nouveau Signal Reçu !</span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(lastSignal.created_at).toLocaleTimeString('fr-FR')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {lastSignal.signal_type === 'BUY' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className="font-bold text-xl">{lastSignal.signal_type}</span>
                <span className="text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded">
                  {lastSignal.confidence}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold">
                {parseFloat(lastSignal.entry_price).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} $
              </div>
              <div className="text-xs text-gray-500">Prix d'entrée</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Target className="w-4 h-4" />
              <span>TP: {parseFloat(lastSignal.take_profit).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <Shield className="w-4 h-4" />
              <span>SL: {parseFloat(lastSignal.stop_loss).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{lastSignal.horizon_minutes || 240}min</span>
            </div>
          </div>
        </div>
      )}

      {/* Signal Stream */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Flux des signaux (10 derniers)
        </h3>

        {liveSignals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            En attente de nouveaux signaux...
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {liveSignals.map((signal) => (
              <div
                key={signal.id}
                className={`p-3 rounded-lg border ${
                  signal.signal_type === 'BUY'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                    : signal.signal_type === 'SELL'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                } transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-2 py-1 rounded font-bold text-sm ${
                        signal.signal_type === 'BUY'
                          ? 'bg-green-600 text-white'
                          : signal.signal_type === 'SELL'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {signal.signal_type}
                    </div>

                    <div className="text-sm">
                      <span className="font-semibold">
                        {parseFloat(signal.entry_price).toFixed(2)} $
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        • {signal.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(signal.created_at).toLocaleTimeString('fr-FR')}
                  </div>
                </div>

                <div className="mt-2 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>TP: {parseFloat(signal.take_profit).toFixed(2)}</span>
                  <span>SL: {parseFloat(signal.stop_loss).toFixed(2)}</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      signal.status === 'active'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {signal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
