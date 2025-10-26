import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

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

    // Récupérer la watchlist active
    const { data: watchlist, error: watchlistError } = await supabase
      .from('crypto_watchlist')
      .select('symbol')
      .eq('is_active', true);

    if (watchlistError) throw watchlistError;

    // Fetch des données de marché depuis Binance
    const symbols = watchlist?.map(w => w.symbol) || [];
    const binanceUrl = 'https://api.binance.com/api/v3/ticker/24hr';
    const response = await fetch(binanceUrl);
    const allTickers = await response.json();

    // Filtrer uniquement les symboles de la watchlist
    const relevantTickers = allTickers.filter((ticker: any) => 
      symbols.includes(ticker.symbol)
    );

    // Transformer et stocker les données de marché
    const marketData: CryptoData[] = relevantTickers.map((ticker: any) => ({
      symbol: ticker.symbol,
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      volume24h: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
    }));

    // Mettre à jour la table crypto_market_data
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

    // Générer les signaux de trading
    const signals: Signal[] = [];

    for (const crypto of marketData) {
      // Fetch historical data pour calcul d'indicateurs
      const klineUrl = `https://api.binance.com/api/v3/klines?symbol=${crypto.symbol}&interval=1h&limit=100`;
      const klineResponse = await fetch(klineUrl);
      const klines = await klineResponse.json();

      if (!Array.isArray(klines) || klines.length < 50) continue;

      // Calcul des indicateurs techniques
      const closePrices = klines.map((k: any) => parseFloat(k[4]));
      const volumes = klines.map((k: any) => parseFloat(k[5]));
      
      const indicators = calculateIndicators(closePrices, volumes);
      const signal = generateSignal(crypto, indicators);

      if (signal && signal.signal_type !== 'WAIT') {
        signals.push(signal);
      }
    }

    // Insérer les nouveaux signaux dans la DB
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

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

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
  
  // Simplified signal line (normally would use EMA of MACD)
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

  // Stratégie de trading basée sur les indicateurs
  
  // Conditions d'achat (BUY)
  if (
    rsi < 35 && // RSI oversold
    macd.histogram > 0 && // MACD bullish
    currentPrice > ema20 && // Prix au-dessus EMA20
    volume > 1.2 && // Volume élevé
    priceChange > -2 // Pas de chute brutale
  ) {
    signalType = 'BUY';
    confidence = 70;
    reasons.push('RSI en survente', 'MACD haussier', 'Volume fort');
    explain = `Signal d'achat détecté sur ${crypto.symbol.replace('USDT', '')}. Le RSI indique une survente (${rsi.toFixed(1)}), le MACD est haussier et le volume est ${(volume * 100).toFixed(0)}% au-dessus de la moyenne.`;
  }
  // Conditions d'achat modérées
  else if (
    rsi < 45 &&
    currentPrice > ema20 &&
    ema20 > ema50 && // Tendance haussière
    macd.histogram > 0
  ) {
    signalType = 'BUY';
    confidence = 60;
    reasons.push('Tendance haussière', 'RSI favorable', 'MACD positif');
    explain = `Opportunité d'achat modérée sur ${crypto.symbol.replace('USDT', '')}. La tendance est haussière avec l'EMA20 au-dessus de l'EMA50.`;
  }
  // Conditions de vente (SELL)
  else if (
    rsi > 70 && // RSI overbought
    macd.histogram < 0 && // MACD bearish
    currentPrice < ema20 &&
    priceChange < 0
  ) {
    signalType = 'SELL';
    confidence = 65;
    reasons.push('RSI en surachat', 'MACD baissier', 'Prix sous EMA20');
    explain = `Signal de vente sur ${crypto.symbol.replace('USDT', '')}. Le RSI indique un surachat (${rsi.toFixed(1)}), le MACD est baissier et le prix passe sous l'EMA20.`;
  }
  // Signal fort de vente
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

  // Calcul des niveaux de prix
  const takeProfit = signalType === 'BUY' 
    ? currentPrice * 1.03 // +3% profit target
    : currentPrice * 0.97; // -3% profit target

  const stopLoss = signalType === 'BUY'
    ? currentPrice * 0.98 // -2% stop loss
    : currentPrice * 1.02; // +2% stop loss

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
