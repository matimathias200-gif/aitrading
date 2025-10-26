import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react';

const BacktestResults = ({ results }) => {
  const metrics = [
    {
      label: 'Profit Total',
      value: `${results.totalProfit.toFixed(2)}€`,
      icon: TrendingUp,
      color: results.totalProfit >= 0 ? 'green' : 'red',
    },
    {
      label: 'Drawdown Max',
      value: `${results.maxDrawdown.toFixed(2)}%`,
      icon: TrendingDown,
      color: 'red',
    },
    {
      label: 'Taux de Réussite',
      value: `${results.winRate.toFixed(1)}%`,
      icon: Target,
      color: 'blue',
    },
    {
      label: 'Sharpe Ratio',
      value: results.sharpeRatio.toFixed(2),
      icon: Award,
      color: 'purple',
    },
  ];

  const colorClasses = {
    green: 'from-green-500 to-emerald-500',
    red: 'from-red-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-fuchsia-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-xl p-6"
    >
      <h3 className="text-xl font-bold mb-6">Résultats du Backtest</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[metric.color]} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-muted-foreground">{metric.label}</span>
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <span className="text-sm text-muted-foreground">Nombre de Trades</span>
          <span className="font-semibold">{results.totalTrades}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <span className="text-sm text-muted-foreground">Trades Gagnants</span>
          <span className="font-semibold text-green-400">{results.winningTrades}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <span className="text-sm text-muted-foreground">Trades Perdants</span>
          <span className="font-semibold text-red-400">{results.losingTrades}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default BacktestResults;