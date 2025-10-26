import React from 'react';
    import { motion } from 'framer-motion';
    import { Newspaper, Bitcoin, CandlestickChart, Wifi, WifiOff, Gem } from 'lucide-react';

    const LiveFeed = ({ liveData, isReal }) => {
      if (!liveData) return null;

      const { assets, forex, news } = liveData;

      const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
      };

      const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
      };
      
      const getAssetIcon = (asset) => {
        if (asset.symbol.includes('BTC')) return <Bitcoin className="w-5 h-5 text-yellow-400" />;
        if (asset.symbol.includes('ETH')) return <Gem className="w-5 h-5 text-gray-400" />;
        if (asset.symbol.includes('SOL')) return <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-400 to-cyan-400" />;
        if (asset.symbol.includes('XAU')) return <div className="w-5 h-5 rounded-full bg-yellow-500" />;
        return <CandlestickChart className="w-5 h-5 text-purple-400" />;
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="glass-effect rounded-xl p-6 space-y-4"
          >
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                <CandlestickChart className="w-5 h-5 text-blue-400" />
                Données de Marché
                </h3>
                <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full ${isReal ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {isReal ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>{isReal ? "Live" : "Simulé (Fallback)"}</span>
                </div>
            </div>
            
            {assets.map(asset => (
                <motion.div variants={itemVariants} key={asset.symbol} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3 mb-1">
                    {getAssetIcon(asset)}
                    <span className="font-semibold">{asset.symbol}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold">{asset.price.toFixed(asset.type === 'Crypto' ? 2 : 2)}</span>
                    {asset.type === 'Crypto' && (
                        <span className={`font-semibold ${asset.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {asset.percent_change.toFixed(2)}%
                        </span>
                    )}
                  </div>
                </motion.div>
            ))}
             <motion.div variants={itemVariants} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3 mb-1">
                 <CandlestickChart className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">{forex.instrument}</span>
              </div>
              <span className="text-2xl font-bold">{forex.bid.toFixed(5)}</span>
            </motion.div>
          </motion.div>

           <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="glass-effect rounded-xl p-6 space-y-3"
          >
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-green-400" />
              Actualités
            </h3>
            {news.map((headline, index) => (
              <motion.div key={index} variants={itemVariants} className="text-sm p-2 bg-white/5 rounded-md">
                {headline}
              </motion.div>
            ))}
          </motion.div>
        </div>
      );
    };

    export default LiveFeed;