
import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';
    import { TrendingUp, BarChart, History, LogIn, Loader2, List, ArrowRight } from 'lucide-react';
    import SignalList from './SignalList';
    import AiStatusBanner from './AiStatusBanner';
    import MarketHeatmap from './MarketHeatmap';
    import SignalTimeline from './SignalTimeline';
    import AiControlPanel from './AiControlPanel';
    import LiveMarketTable from './LiveMarketTable';
    import ScanRecommendation from './ScanRecommendation';
    import InitialSignalGenerator from './InitialSignalGenerator';
    import { Button } from './ui/button';

    const CryptoDashboard = ({ signals, marketData, isLoading, user, settings, setSettings }) => {
      const [latestSignal, setLatestSignal] = useState(null);

      useEffect(() => {
        if (signals.length > 0) {
          const sortedSignals = [...signals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setLatestSignal(sortedSignals[0]);
        }
      }, [signals]);

      if (!user && !isLoading) {
        return (
          <div className="glass-effect rounded-xl p-12 text-center mt-10">
            <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
            <p className="text-muted-foreground">Veuillez vous connecter pour accéder au tableau de bord.</p>
          </div>
        );
      }

      if (isLoading && signals.length === 0) {
          return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-16 h-16 animate-spin text-blue-400" />
            </div>
          );
      }

      const activeSignals = signals.filter(s => s.status === 'active');
      const historySignals = signals.filter(s => s.status !== 'active');
      const recentSignals = signals.slice(0, 5);

      return (
        <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold gradient-text flex items-center gap-3">
                <TrendingUp />
                Dashboard Crypto
                </h2>
                <p className="text-muted-foreground mt-1">L'IA analyse le marché et affiche les opportunités en temps réel.</p>
            </div>
            <AiStatusBanner lastSignalTime={latestSignal?.created_at} />
          </div>

          <ScanRecommendation signal={latestSignal} />
          <InitialSignalGenerator signalsCount={signals.length} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <MarketHeatmap marketData={marketData} limit={10} />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold flex items-center gap-3"><BarChart /> Signaux Actifs</h3>
                    {activeSignals.length > 4 && (
                        <Button asChild variant="ghost" className="text-sm">
                            <Link to="/signals/active">
                            Voir tout <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    )}
                </div>
                <SignalList signals={activeSignals} isLoading={isLoading && signals.length === 0} limit={4} />
              </motion.div>
            </div>
            <div className="space-y-8">
                <AiControlPanel settings={settings} setSettings={setSettings} />
                <SignalTimeline signals={recentSignals} />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3"><List /> Marché en Direct</h3>
            <LiveMarketTable />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3"><History /> Historique Récent</h3>
            <SignalList signals={historySignals} isLoading={isLoading && signals.length === 0} isHistory={true}/>
          </motion.div>
        </motion.div>
      );
    };

    export default CryptoDashboard;
