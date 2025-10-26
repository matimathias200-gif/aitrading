import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, BarChart, ArrowUp, ArrowDown } from 'lucide-react';

const MarketOverview = ({ marketData }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {marketData.map((coin) => {
        const isPositive24h = coin.change_24h >= 0;
        return (
          <motion.div key={coin.symbol} variants={item} className="glass-effect rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold">{coin.symbol}/USD</p>
                <p className="text-2xl font-bold mt-2">${(coin.price || 0).toLocaleString()}</p>
              </div>
              <div className={`p-2 rounded-full ${isPositive24h ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {isPositive24h ? <ArrowUp className="text-green-400" /> : <ArrowDown className="text-red-400" />}
              </div>
            </div>
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <span>24h %</span>
              <span className={`font-semibold ${isPositive24h ? 'text-green-400' : 'text-red-400'}`}>
                {(coin.change_24h || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Volume 24h</span>
              <span className="font-semibold">${(coin.volume_24h || 0).toLocaleString()}</span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default MarketOverview;