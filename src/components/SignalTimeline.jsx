import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

const TimelineItem = ({ signal, isLast }) => {
  const isBuy = signal.signal_type === 'BUY';
  return (
    <div className="relative pl-8">
      {!isLast && <div className="absolute left-3 top-5 h-full w-0.5 bg-white/10"></div>}
      <div className="absolute left-0 top-2.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {isBuy ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
        </div>
      </div>
      <p className="font-bold text-sm">{signal.symbol} - <span className={isBuy ? 'text-green-400' : 'text-red-400'}>{signal.signal_type}</span></p>
      <p className="text-xs text-muted-foreground">Confiance: {signal.confidence.toFixed(0)}%</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <Clock className="w-3 h-3" />
        {new Date(signal.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

const SignalTimeline = ({ signals }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-xl p-4"
    >
      <h3 className="text-lg font-bold mb-4 text-white">Derniers Signaux Détectés</h3>
      <div className="space-y-4">
        {signals.length > 0 ? signals.map((signal, index) => (
          <TimelineItem key={signal.id} signal={signal} isLast={index === signals.length - 1} />
        )) : (
          <p className="text-sm text-muted-foreground text-center py-4">En attente des premiers signaux...</p>
        )}
      </div>
    </motion.div>
  );
};

export default SignalTimeline;