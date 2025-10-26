import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    red: 'from-red-500 to-pink-500',
    purple: 'from-purple-500 to-fuchsia-500',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-effect rounded-xl p-6 relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 blur-3xl`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-xs text-muted-foreground">{trend}</div>
      </div>
    </motion.div>
  );
};

export default StatsCard;