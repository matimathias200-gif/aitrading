import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { BinanceWebSocketManager } from '@/lib/websocket-manager';

const LiveMarketTable = () => {
  const [liveData, setLiveData] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const wsManagerRef = useRef(null);

  useEffect(() => {
    const fetchWatchlist = async () => {
      const { data, error } = await supabase
        .from('crypto_watchlist')
        .select('symbol')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching watchlist:', error);
      } else if (data) {
        const uniqueSymbols = [...new Set(data.map(item => item.symbol.toLowerCase()))];
        setWatchlist(uniqueSymbols);
        setLiveData(uniqueSymbols.map(s => ({ s: s.toUpperCase(), p: '0', P: '0.00', q: '0', v: '0' })));
        setIsLoading(false);
      }
    };
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) return;

    const handleMessage = (relevantTickers) => {
      setIsConnected(true);
      const uniqueTickers = relevantTickers.filter(
        (v, i, a) => a.findIndex(t => t.s === v.s) === i
      );

      setLiveData(currentData => {
        const dataMap = new Map(currentData.map(d => [d.s, d]));
        uniqueTickers.forEach(ticker => {
          dataMap.set(ticker.s, {
            s: ticker.s,
            p: ticker.c,
            P: ticker.P,
            q: ticker.q,
            v: ticker.v,
          });
        });

        const sortedAndUniqueData = Array.from(dataMap.values())
          .filter((v, i, a) => a.findIndex(t => t.s === v.s) === i)
          .sort((a,b) => parseFloat(b.q) - parseFloat(a.q));

        return sortedAndUniqueData;
      });
    };

    wsManagerRef.current = new BinanceWebSocketManager(watchlist, handleMessage);
    wsManagerRef.current.connect();

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    };
  }, [watchlist]);

  const formatVolume = (volume) => {
    const num = parseFloat(volume);
    if (num > 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num > 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num > 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(0);
  };

  return (
    <motion.div
      className="glass-effect rounded-xl p-4 overflow-hidden"
    >
      {isConnected && (
        <div className="flex items-center gap-2 text-xs text-green-400 mb-2">
          <Wifi className="w-3 h-3" />
          <span>Live</span>
        </div>
      )}
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className='sticky top-0 bg-secondary/50 backdrop-blur-sm'>
            <tr>
              <th className="text-left p-2 font-semibold">Symbole</th>
              <th className="text-right p-2 font-semibold">Prix (USD)</th>
              <th className="text-right p-2 font-semibold">Var. 24h</th>
              <th className="text-right p-2 font-semibold">Volume 24h</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4" className="text-center p-8 text-muted-foreground">Chargement du marché...</td></tr>
            ) : liveData.map((data) => {
              const change = parseFloat(data.P);
              const isPositive = change >= 0;
              const price = parseFloat(data.p);
              const volume = parseFloat(data.v);
              const isInactive = price === 0 && volume === 0;

              return (
                <tr key={data.s} className="border-b border-white/5 hover:bg-white/10 transition-colors">
                  <td className="p-2 font-bold flex items-center gap-2">
                    {data.s.replace('USDT', '')}
                    {isInactive && <AlertTriangle className="w-4 h-4 text-yellow-500" title="Données inactives" />}
                  </td>
                  <td className="text-right p-2 font-mono">{price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                  <td className={`text-right p-2 font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </td>
                  <td className="text-right p-2 text-muted-foreground font-mono">${formatVolume(data.q)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default LiveMarketTable;