import { supabase } from '@/lib/customSupabaseClient';

export class TradingEngine {
  constructor(capital) {
    this.capital = capital;
  }

  async getRealMarketData() {
    const { data, error } = await supabase.functions.invoke('live-market-data-fetcher');
    if (error) {
      console.error("Error fetching live market data:", error);
      throw new Error("Could not fetch real market data.");
    }
    if (!data) {
      throw new Error("No data returned from market data fetcher.");
    }
    return data;
  }

  async generateLiveSignals(cooldowns) {
    try {
      const { signals, assets, forex, news } = await this.getRealMarketData();

      const liveDataPayload = {
        assets: assets || [],
        forex: forex || {},
        news: news || [],
      };

      if (!signals || signals.length === 0) {
        return { newSignals: [], liveData: liveDataPayload };
      }
      
      const now = Date.now();
      const validSignals = signals.filter(signal => {
          const cooldownKey = `${signal.symbol}-${signal.horizon_minutes}`;
          return !cooldowns[cooldownKey] || now > cooldowns[cooldownKey];
      });
      
      return {
        newSignals: validSignals,
        liveData: liveDataPayload,
      };

    } catch (error) {
      console.error("Failed to generate live signal with real data:", error);
      return { newSignals: [], liveData: null };
    }
  }
}