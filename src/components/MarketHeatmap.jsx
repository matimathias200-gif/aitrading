
import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

const MarketHeatmap = ({ marketData, limit }) => {
  const dataToDisplay = limit ? marketData.slice(0, limit) : marketData;

  return (
    <motion.div
      className="glass-effect rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <AreaChart /> Heatmap du Marché (24h)
        </h3>
        {limit && marketData.length > limit && (
          <Button asChild variant="ghost" className="text-sm">
            <Link to="/market">
              Voir tout <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {dataToDisplay.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground p-8">
            En attente des données du marché...
          </div>
        ) : (
          dataToDisplay.map((crypto) => {
            const change24h = crypto.change_24h || 0;
            const isPositive = change24h >= 0;
            const displayChange = change24h.toFixed(2);
            
            const intensity = Math.min(Math.abs(change24h) / 5, 1); // Normalize intensity (cap at 5% change)
            const baseColor = isPositive ? '34, 197, 94' : '239, 68, 68'; // green-500 or red-500
            const backgroundColor = `rgba(${baseColor}, ${0.4 + intensity * 0.6})`;

            return (
              <motion.div
                key={crypto.id || crypto.symbol}
                className="p-4 rounded-lg text-center shadow-lg transform hover:scale-105 transition-all duration-300 flex flex-col justify-center"
                style={{ backgroundColor }}
                whileHover={{ scale: 1.05, zIndex: 10 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-lg font-semibold text-white uppercase">{crypto.symbol}</p>
                <p className={`text-xl font-bold text-white`}>
                  {isPositive ? '+' : ''}{displayChange}%
                </p>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default MarketHeatmap;
