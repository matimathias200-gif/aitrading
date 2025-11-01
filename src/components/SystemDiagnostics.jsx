import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Activity, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/customSupabaseClient';

export default function SystemDiagnostics() {
  const [diagnostics, setDiagnostics] = useState({
    apis: [],
    functions: [],
    signals: { btc: null, eth: null },
    learning: null,
    lastUpdate: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDiagnostics = async () => {
    try {
      // Fetch API logs (dernières 24h)
      const { data: apiLogs } = await supabase
        .from('api_logs')
        .select('*')
        .gte('called_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('called_at', { ascending: false })
        .limit(100);

      // Group API logs by name
      const apiStats = {};
      apiLogs?.forEach(log => {
        if (!apiStats[log.api_name]) {
          apiStats[log.api_name] = {
            name: log.api_name,
            total: 0,
            success: 0,
            errors: 0,
            avgResponseTime: 0,
            lastCalled: log.called_at,
            status: 'OK'
          };
        }
        apiStats[log.api_name].total++;
        if (log.status === 'OK') apiStats[log.api_name].success++;
        else apiStats[log.api_name].errors++;
        apiStats[log.api_name].avgResponseTime += log.response_time_ms || 0;
      });

      Object.values(apiStats).forEach(api => {
        api.avgResponseTime = Math.round(api.avgResponseTime / api.total);
        api.successRate = Math.round((api.success / api.total) * 100);
        if (api.successRate < 50) api.status = 'ERROR';
        else if (api.successRate < 80) api.status = 'WARNING';
      });

      // Fetch function logs
      const { data: functionLogs } = await supabase
        .from('function_logs')
        .select('*')
        .gte('called_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('called_at', { ascending: false })
        .limit(50);

      const functionStats = {};
      functionLogs?.forEach(log => {
        if (!functionStats[log.function_name]) {
          functionStats[log.function_name] = {
            name: log.function_name,
            total: 0,
            success: 0,
            errors: 0,
            lastRun: log.called_at,
            avgLatency: 0
          };
        }
        functionStats[log.function_name].total++;
        if (log.success) functionStats[log.function_name].success++;
        else functionStats[log.function_name].errors++;
        functionStats[log.function_name].avgLatency += log.latency_ms || 0;
      });

      Object.values(functionStats).forEach(func => {
        func.avgLatency = Math.round(func.avgLatency / func.total);
        func.successRate = Math.round((func.success / func.total) * 100);
      });

      // Fetch latest signals
      const { data: btcSignal } = await supabase
        .from('crypto_signals')
        .select('*')
        .eq('symbol', 'BTCUSDT')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: ethSignal } = await supabase
        .from('crypto_signals')
        .select('*')
        .eq('symbol', 'ETHUSDT')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch learning stats
      const { data: learningLog } = await supabase
        .from('ai_learning_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDiagnostics({
        apis: Object.values(apiStats),
        functions: Object.values(functionStats),
        signals: { btc: btcSignal, eth: ethSignal },
        learning: learningLog,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Chargement des diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Diagnostic Système</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Dernière mise à jour: {formatTime(diagnostics.lastUpdate)}
          </span>
          <button
            onClick={fetchDiagnostics}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* API Status */}
      <div>
        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Statut des APIs Externes
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          {diagnostics.apis.map((api) => (
            <motion.div
              key={api.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(api.status)}
                  <span className="font-semibold">{api.name}</span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(api.lastCalled)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Taux réussite</div>
                  <div className={`font-bold ${api.successRate >= 80 ? 'text-green-500' : api.successRate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {api.successRate}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Appels</div>
                  <div className="font-bold text-white">{api.total}</div>
                </div>
                <div>
                  <div className="text-gray-500">Latence moy</div>
                  <div className="font-bold text-white">{api.avgResponseTime}ms</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Function Status */}
      <div>
        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Fonctions Supabase
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          {diagnostics.functions.map((func) => (
            <motion.div
              key={func.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {func.successRate >= 90 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="font-semibold text-sm">{func.name}</span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(func.lastRun)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Succès</div>
                  <div className="font-bold text-green-500">{func.successRate}%</div>
                </div>
                <div>
                  <div className="text-gray-500">Total</div>
                  <div className="font-bold text-white">{func.total}</div>
                </div>
                <div>
                  <div className="text-gray-500">Latence</div>
                  <div className="font-bold text-white">{func.avgLatency}ms</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Latest Signals */}
      <div>
        <h4 className="text-lg font-semibold mb-3">Derniers Signaux Générés</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {['btc', 'eth'].map((symbol) => {
            const signal = diagnostics.signals[symbol];
            return (
              <div key={symbol} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">{symbol.toUpperCase()}USDT</span>
                  {signal ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      signal.signal_type === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {signal.signal_type}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">Aucun signal</span>
                  )}
                </div>
                {signal && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confiance:</span>
                      <span className="font-bold">{signal.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Créé:</span>
                      <span>{formatTime(signal.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Learning Status */}
      {diagnostics.learning && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-2">Apprentissage IA</h4>
          <p className="text-sm text-gray-400 mb-3">
            Dernière analyse: {formatTime(diagnostics.learning.created_at)}
          </p>
          {diagnostics.learning.recommendations && (
            <div className="space-y-1">
              {diagnostics.learning.recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="text-xs text-gray-300">
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
