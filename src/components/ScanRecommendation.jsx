import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, TrendingDown, Target, Zap, MessageSquare } from 'lucide-react';

const Detail = ({ icon: Icon, label, value, colorClass = '' }) => (
  <div>
    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon className="w-3 h-3"/>{label}</span>
    <p className={`font-semibold text-lg ${colorClass}`}>{value}</p>
  </div>
);

const ScanRecommendation = ({ signal }) => {
  if (!signal) {
    return (
       <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-effect p-6 rounded-2xl border border-blue-500/20 text-center"
      >
        <Lightbulb className="w-8 h-8 mx-auto text-blue-400 mb-2" />
        <h3 className="text-xl font-bold mb-1">En attente de la prochaine analyse</h3>
        <p className="text-muted-foreground text-sm">L'IA recherche activement la meilleure opportunité de marché.</p>
      </motion.div>
    );
  }

  const isBuy = signal.signal_type === 'BUY';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`glass-effect p-6 rounded-2xl border ${isBuy ? 'border-green-500/30' : 'border-red-500/30'} overflow-hidden relative`}
    >
       <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${isBuy ? 'from-green-500/20' : 'from-red-500/20'} to-transparent -z-10 rounded-full blur-3xl`}></div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold gradient-text flex items-center gap-2">
            <Lightbulb className="text-yellow-400"/> Recommandation du Scan
        </h3>
        <div className={`flex items-center gap-2 font-bold text-2xl px-4 py-1.5 rounded-lg ${isBuy ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
          {isBuy ? <TrendingUp/> : <TrendingDown/>}
          {signal.signal_type}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end">
        <Detail icon={Target} label="Actif" value={signal.symbol} />
        <Detail icon={Zap} label="Prix d'entrée" value={`$${Number(signal.entry_price).toFixed(2)}`} />
        <Detail icon={Zap} label="Confiance" value={`${Number(signal.confidence).toFixed(0)}%`} colorClass={isBuy ? 'text-green-400' : 'text-red-400'} />
        <div className="col-span-2 md:col-span-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MessageSquare className="w-3 h-3" />Raison</p>
            <p className="font-semibold text-sm italic">"{signal.reason?.explain || 'Tendance claire détectée'}"</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ScanRecommendation;