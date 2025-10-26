import React from 'react';
    import { AnimatePresence } from 'framer-motion';
    import SignalCard from './SignalCard';
    import { Loader2, BellOff } from 'lucide-react';

    const SignalList = ({ signals, isLoading, isHistory = false, limit }) => {
      const dataToDisplay = limit ? signals.slice(0, limit) : signals;

      if (isLoading && dataToDisplay.length === 0) {
        return (
          <div className="flex justify-center items-center h-48 glass-effect rounded-xl">
            <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          </div>
        );
      }

      if (dataToDisplay.length === 0) {
        return (
          <div className="text-center py-12 glass-effect rounded-xl">
            <BellOff className="w-12 h-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">{isHistory ? "Aucun trade dans l'historique." : "Aucun signal actif pour le moment."}</p>
          </div>
        );
      }
      
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
                {dataToDisplay.map((signal) => (
                    <SignalCard key={signal.id} signal={signal} isHistory={isHistory}/>
                ))}
            </AnimatePresence>
        </div>
      );
    };

    export default SignalList;