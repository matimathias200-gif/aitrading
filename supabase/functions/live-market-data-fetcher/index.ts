import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { corsHeaders } from './cors.ts';

interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  volume: number;
  priceChange: number;
}

interface CryptoData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

async function fetchMarketDataWithFallback(symbols: string[]) {
  const BINANCE_URLS = [
    'https://api-gateway.binance.com/api/v3/ticker/24hr',
    'https://data-api.binance.vision/api/v3/ticker/24hr',
    'https://api.binance.com/api/v3/ticker/24hr'
  ];

  for (const url of BINANCE_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return { success: true, data: data.filter((t: any) => symbols.includes(t.symbol)) };
        }
      }
    } catch (error) {
      console.log(`Binance URL failed: ${url}`);
    }
  }

  return { success: false, data: [] };
}

async function fetchKlinesWithFallback(symbol: string) {
  const BINANCE_URLS = [
    `https://api-gateway.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`
  ];

  for (const url of BINANCE_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length >= 50) {
          return { success: true, data };
        }
      }
    } catch (error) {
      console.log(`Klines URL failed: ${url}`);
    }
  }

  return { success: false, data: [] };
}

interface Signal {
  symbol: string;
  signal_type: 'BUY' | 'SELL' | 'WAIT';
  entry_price: number;
  take_profit: number;
  stop_loss: number;
  confidence: number;
  reason: {
    explain: string;
    indicators: string[];
  };
  horizon_minutes: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: watchlist, error: watchlistError } = await supabase
      .from('crypto_watchlist')
      .select('symbol')
      .eq('is_active', true);

    if (watchlistError) throw watchlistError;

    const symbols = watchlist?.map(w => w.symbol) || [];
    const marketResult = await fetchMarketDataWithFallback(symbols);

    if (!marketResult.success || marketResult.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Market data unavailable from all sources' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const relevantTickers = marketResult.data;

    const marketData: CryptoData[] = relevantTickers.map((ticker: any) => ({
      symbol: ticker.symbol,
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      volume24h: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
    }));

    for (const data of marketData) {
      await supabase
        .from('crypto_market_data')
        .upsert({
          symbol: data.symbol,
          current_price: data.price,
          change_24h: data.change24h,
          volume_24h: data.volume24h,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'symbol' });
    }

    for (const data of marketData) {
      await supabase
        .from('crypto_prices')
        .upsert({
          symbol: data.symbol,
          price: data.price,
          change_24h: data.change24h,
          volume_24h: data.volume24h,
          market_cap: 0,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'symbol' });
    }

    const signals: Signal[] = [];

    for (const crypto of marketData) {
      const klinesResult = await fetchKlinesWithFallback(crypto.symbol);
      if (!klinesResult.success || klinesResult.data.length < 50) continue;

      const klines = klinesResult.data;
      const closePrices = klines.map((k: any) => parseFloat(k[4]));
      const volumes = klines.map((k: any) => parseFloat(k[5]));
      
      const indicators = calculateIndicators(closePrices, volumes);
      const signal = generateSignal(crypto, indicators);

      if (signal && signal.signal_type !== 'WAIT') {
        signals.push(signal);
      }
    }

    if (signals.length > 0) {
      const { error: insertError } = await supabase
        .from('crypto_signals')
        .insert(signals.map(s => ({
          symbol: s.symbol,
          signal_type: s.signal_type,
          entry_price: s.entry_price,
          take_profit: s.take_profit,
          stop_loss: s.stop_loss,
          confidence: s.confidence,
          reason: s.reason,
          horizon_minutes: s.horizon_minutes,
          status: 'active',
        })));

      if (insertError) {
        console.error('Error inserting signals:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        signals,
        assets: marketData,
        forex: {},
        news: [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in live-market-data-fetcher:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateIndicators(prices: number[], volumes: number[]): TechnicalIndicators {
  const rsi = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);
  const ema20 = calculateEMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const priceChange = ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100;

  return {
    rsi,
    macd,
    ema20,
    ema50,
    volume: currentVolume / avgVolume,
    priceChange,
  };
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  const signal = macd * 0.9;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function generateSignal(crypto: CryptoData, indicators: TechnicalIndicators): Signal | null {
  const { rsi, macd, ema20, ema50, volume, priceChange } = indicators;
  const currentPrice = crypto.price;

  let signalType: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let confidence = 50;
  const reasons: string[] = [];
  let explain = '';

  if (
    rsi < 35 &&
    macd.histogram > 0 &&
    currentPrice > ema20 &&
    volume > 1.2 &&
    priceChange > -2
  ) {
    signalType = 'BUY';
    confidence = 70;
    reasons.push('RSI en survente', 'MACD haussier', 'Volume fort');
    explain = `Signal d'achat détecté sur ${crypto.symbol.replace('USDT', '')}. Le RSI indique une survente (${rsi.toFixed(1)}), le MACD est haussier et le volume est ${(volume * 100).toFixed(0)}% au-dessus de la moyenne.`;
  }
  else if (
    rsi < 45 &&
    currentPrice > ema20 &&
    ema20 > ema50 &&
    macd.histogram > 0
  ) {
    signalType = 'BUY';
    confidence = 60;
    reasons.push('Tendance haussière', 'RSI favorable', 'MACD positif');
    explain = `Opportunité d'achat modérée sur ${crypto.symbol.replace('USDT', '')}. La tendance est haussière avec l'EMA20 au-dessus de l'EMA50.`;
  }
  else if (
    rsi > 70 &&
    macd.histogram < 0 &&
    currentPrice < ema20 &&
    priceChange < 0
  ) {
    signalType = 'SELL';
    confidence = 65;
    reasons.push('RSI en surachat', 'MACD baissier', 'Prix sous EMA20');
    explain = `Signal de vente sur ${crypto.symbol.replace('USDT', '')}. Le RSI indique un surachat (${rsi.toFixed(1)}), le MACD est baissier et le prix passe sous l'EMA20.`;
  }
  else if (
    rsi > 75 &&
    currentPrice < ema50 &&
    priceChange < -3 &&
    volume > 1.5
  ) {
    signalType = 'SELL';
    confidence = 75;
    reasons.push('RSI critique', 'Chute du prix', 'Volume de panique');
    explain = `Alerte de vente sur ${crypto.symbol.replace('USDT', '')}. RSI très élevé (${rsi.toFixed(1)}), chute de prix de ${priceChange.toFixed(1)}% avec volume important.`;
  }

  if (signalType === 'WAIT') return null;

  const takeProfit = signalType === 'BUY' 
    ? currentPrice * 1.03
    : currentPrice * 0.97;

  const stopLoss = signalType === 'BUY'
    ? currentPrice * 0.98
    : currentPrice * 1.02;

  return {
    symbol: crypto.symbol,
    signal_type: signalType,
    entry_price: currentPrice,
    take_profit: takeProfit,
    stop_loss: stopLoss,
    confidence,
    reason: {
      explain,
      indicators: reasons,
    },
    horizon_minutes: 60,
  };
}
