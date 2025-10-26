import React, { useState, useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { TrendingUp, Filter, Zap, Loader2, LogIn, CheckCircle } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import SignalCard from '@/components/SignalCard';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';

    const SignalsPanel = ({ signals, isLoading, user }) => {
      const { toast } = useToast();
      const [filter, setFilter] = useState('all');
      const [assetFilter, setAssetFilter] = useState('all');
      const [activating, setActivating] = useState(null);

      const availableAssets = useMemo(() => {
        const assets = new Set(signals.map(s => s.symbol));
        return ['all', ...Array.from(assets)];
      }, [signals]);

      const filteredSignals = useMemo(() => {
        return signals.filter(signal => {
          const filterMatch = filter === 'all' || 
                              (filter === 'BUY' && signal.direction === 'LONG') ||
                              (filter === 'SELL' && signal.direction === 'SHORT');
          
          const assetMatch = assetFilter === 'all' || signal.symbol === assetFilter;

          return filterMatch && assetMatch;
        });
      }, [signals, filter, assetFilter]);
      
      const activatePaperTrade = async (signal) => {
        if (!user) {
            toast({ title: "Erreur", description: "Vous devez être connecté pour activer un trade.", variant: "destructive" });
            return;
        }
        setActivating(signal.id);
        
        // This is a recommendation, so we insert into the paper_trades table
        // We link it by its new ID from the signals table
        const { error } = await supabase.from('paper_trades').insert({
            user_id: user.id,
            recommendation_id: null, // No direct recommendation ID from this flow
            symbol: signal.symbol,
            side: signal.direction,
            entry_price: signal.entry,
            entry_time: new Date().toISOString(),
            sl: signal.sl,
            tp: signal.tp,
            size_value_eur: 1, // Placeholder
            size_asset: 1 / signal.entry, // Placeholder
            confidence: signal.confidence,
            horizon_minutes: 60, // Default from function
            status: 'OPEN'
        });

        if (error) {
            toast({ title: "Erreur d'activation", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Trade Activé (Papier)", description: `${signal.symbol} a été ajouté à vos trades simulés.` });
        }
        setActivating(null);
      };

      if (!user) {
        return (
          <div className="glass-effect rounded-xl p-12 text-center">
            <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
            <p className="text-muted-foreground">Veuillez vous connecter pour voir les signaux de trading.</p>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold gradient-text">Signaux de Trading</h2>
              <p className="text-muted-foreground mt-1">Analyse en temps réel des opportunités de marché</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                  <SelectTrigger className="w-[180px] glass-effect">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrer par actif" />
                  </SelectTrigger>
                  <SelectContent>
                      {availableAssets.map(asset => (
                          <SelectItem key={asset} value={asset}>{asset === 'all' ? 'Tous les actifs' : asset}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px] glass-effect">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrer par signal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les signaux</SelectItem>
                  <SelectItem value="BUY">LONG</SelectItem>
                  <SelectItem value="SELL">SHORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSignals.length > 0 ? (
              filteredSignals.map((signal, index) => (
                <motion.div
                  key={signal.id || `${signal.generated_at}-${signal.symbol}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col"
                >
                  <SignalCard signal={signal} />
                   <Button 
                    onClick={() => activatePaperTrade(signal)} 
                    className="mt-2 w-full"
                    disabled={activating === signal.id}
                  >
                    {activating === signal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Activer (Paper Trade)
                   </Button>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full glass-effect rounded-xl p-12 text-center">
                {isLoading ? <Loader2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50 animate-spin" /> : <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />}
                <h3 className="text-xl font-semibold mb-2">{isLoading ? 'Recherche de signaux...' : 'Aucun signal disponible'}</h3>
                <p className="text-muted-foreground mb-6">{!isLoading && "L'IA attend des conditions de marché optimales."}</p>
              </div>
            )}
          </div>
        </div>
      );
    };

    export default SignalsPanel;