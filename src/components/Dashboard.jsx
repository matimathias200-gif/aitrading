import React from 'react';
    import { motion } from 'framer-motion';
    import { TrendingUp, TrendingDown, DollarSign, Activity, Zap, Loader2, LogIn } from 'lucide-react';
    import StatsCard from '@/components/StatsCard';
    import SignalCard from '@/components/SignalCard';
    import PerformanceChart from '@/components/PerformanceChart';
    import LiveFeed from '@/components/LiveFeed';

    const Dashboard = ({ signals, capital, isRunning, liveData, isLoading, user }) => {
      const latestSignals = signals.slice(0, 4);
      const buySignals = signals.filter(s => s.direction === 'LONG').length;
      const sellSignals = signals.filter(s => s.direction === 'SHORT').length;
      const avgConfidence = signals.length > 0 
        ? (signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length * 100).toFixed(1)
        : 0;

      if (!user) {
        return (
          <div className="glass-effect rounded-xl p-12 text-center">
            <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
            <p className="text-muted-foreground">Veuillez vous connecter pour accéder au tableau de bord.</p>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold gradient-text">Tableau de Bord</h2>
              <p className="text-muted-foreground mt-1">Vue d'overview de votre système de trading IA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Capital"
              value={`${capital}€`}
              icon={DollarSign}
              trend="+0%"
              color="blue"
            />
            <StatsCard
              title="Signaux BUY"
              value={buySignals}
              icon={TrendingUp}
              trend={`${buySignals} total`}
              color="green"
            />
            <StatsCard
              title="Signaux SELL"
              value={sellSignals}
              icon={TrendingDown}
              trend={`${sellSignals} total`}
              color="red"
            />
            <StatsCard
              title="Confiance Moy."
              value={`${avgConfidence}%`}
              icon={Activity}
              trend="Précision"
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PerformanceChart signals={signals} />
            </div>

            <div className="space-y-6">
               <div className="glass-effect rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-400" />
                      Derniers Signaux
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {latestSignals.length > 0 ? (
                      latestSignals.slice(0, 3).map((s, i) => <SignalCard key={s.timestamp + s.symbol + i} signal={s} compact={true} />)
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {isLoading ? <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin opacity-50" /> : <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />}
                        <p>{isLoading ? 'Recherche de signaux...' : 'Aucun signal récent'}</p>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>

          {liveData && liveData.news && <LiveFeed liveData={liveData} isReal={true}/>}
            
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-effect rounded-xl p-6 border-2 border-green-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <h4 className="font-semibold text-green-400">Système Actif</h4>
                    <p className="text-sm text-muted-foreground">L'IA recherche des signaux de haute qualité.</p>
                  </div>
                </div>
              </motion.div>
            )}
        </div>
      );
    };

    export default Dashboard;