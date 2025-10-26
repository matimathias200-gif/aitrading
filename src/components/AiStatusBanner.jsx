
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, CheckCircle } from 'lucide-react';

const AiStatusBanner = ({ lastSignalTime }) => {
  const [timeSinceLastSignal, setTimeSinceLastSignal] = useState('');

  useEffect(() => {
    if (!lastSignalTime) {
      setTimeSinceLastSignal('N/A');
      return;
    }

    const updateTimer = () => {
      const seconds = Math.floor((new Date() - new Date(lastSignalTime)) / 1000);
      if (seconds < 60) {
        setTimeSinceLastSignal(`il y a ${seconds}s`);
      } else {
        setTimeSinceLastSignal(`il y a ${Math.floor(seconds / 60)}m`);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 30000); // Update every 30 seconds
    return () => clearInterval(intervalId);
  }, [lastSignalTime]);

  const statusConfig = {
    text: "Système Opérationnel",
    icon: CheckCircle,
    color: "text-green-400",
  };
  const Icon = statusConfig.icon;

  return (
    <div className="glass-effect rounded-lg p-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
         <Icon className={`w-5 h-5 ${statusConfig.color}`} />
         <AnimatePresence mode="wait">
           <motion.span
              key={statusConfig.text}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`font-semibold text-sm ${statusConfig.color}`}
            >
              {statusConfig.text}
            </motion.span>
         </AnimatePresence>
      </div>
      <div className="flex items-center text-xs text-muted-foreground gap-2">
          <Wifi className="w-3 h-3" />
          Dernier signal: {timeSinceLastSignal}
      </div>
    </div>
  );
};

export default AiStatusBanner;
