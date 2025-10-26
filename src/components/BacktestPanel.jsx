import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Play, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BacktestResults from '@/components/BacktestResults';
import { useToast } from '@/components/ui/use-toast';

const BacktestPanel = ({ onRunBacktest, results }) => {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [period, setPeriod] = useState('30');
  const { toast } = useToast();

  const handleRunBacktest = () => {
    toast({
      title: "Backtest lancé",
      description: "Analyse des données historiques en cours...",
    });

    onRunBacktest({
      symbol,
      timeframe,
      period: parseInt(period)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold gradient-text">Backtesting</h2>
        <p className="text-muted-foreground mt-1">Testez vos stratégies sur données historiques</p>
      </div>

      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Paramètres du Backtest
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Symbole</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="glass-effect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                <SelectItem value="XAU/USD">XAU/USD (Or)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="glass-effect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="1h">1 heure</SelectItem>
                <SelectItem value="4h">4 heures</SelectItem>
                <SelectItem value="1d">1 jour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Période (jours)</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="glass-effect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
                <SelectItem value="180">180 jours</SelectItem>
                <SelectItem value="365">1 an</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleRunBacktest}
          className="w-full mt-6 gap-2 glow-effect"
          size="lg"
        >
          <Play className="w-5 h-5" />
          Lancer le Backtest
        </Button>
      </div>

      {results && <BacktestResults results={results} />}
    </div>
  );
};

export default BacktestPanel;