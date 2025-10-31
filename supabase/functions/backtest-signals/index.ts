import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * BACKTEST-SIGNALS - Backtesting automatique sur 30 jours
 * Teste les stratégies sur l'historique
 * Calcule win rate, profit moyen, meilleurs patterns
 * S'exécute automatiquement tous les 2 jours
 */

interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[backtest-signals] Starting 30-day backtest...');

    // STEP 1: Récupérer données OHLC des 30 derniers jours
    const ohlcData = await fetchHistoricalData(30);
    console.log(`[backtest-signals] Fetched ${ohlcData.length} candles`);

    if (ohlcData.length < 50) {
      throw new Error('Insufficient historical data for backtest');
    }

    // STEP 2: Créer un nouveau backtest
    const startDate = new Date(ohlcData[0].timestamp);
    const endDate = new Date(ohlcData[ohlcData.length - 1].timestamp);

    const { data: backtestData, error: backtestError } = await supabase
      .from('backtest_results')
      .insert({
        symbol: 'BTCUSDT',
        tested_days: 30,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        signals_tested: 0,
        signals_win: 0,
        signals_loss: 0,
        winrate: 0
      })
      .select()
      .single();

    if (backtestError || !backtestData) {
      throw new Error(`Failed to create backtest: ${backtestError?.message}`);
    }

    const backtestId = backtestData.id;
    console.log(`[backtest-signals] Backtest ID: ${backtestId}`);

    // STEP 3: Calculer indicateurs pour chaque bougie
    const signals: any[] = [];
    let signalsTested = 0;

    for (let i = 50; i < ohlcData.length - 10; i++) {
      const candle = ohlcData[i];
      const historicalPrices = ohlcData.slice(i - 50, i).map(c => c.close);

      // Calculer indicateurs
      const indicators = calculateIndicators(historicalPrices);

      // Déterminer signal
      const signal = generateBacktestSignal(
        candle.close,
        indicators,
        ohlcData.slice(i - 10, i)
      );

      if (signal.signal_type === 'WAIT') continue;

      // Simuler résultat du signal
      const result = simulateSignalResult(
        signal,
        ohlcData.slice(i + 1, Math.min(i + 50, ohlcData.length)),
        candle.timestamp
      );

      signals.push({
        backtest_id: backtestId,
        symbol: 'BTCUSDT',
        signal_type: signal.signal_type,
        entry_price: signal.entry_price,
        exit_price: result.exit_price,
        take_profit: signal.take_profit,
        stop_loss: signal.stop_loss,
        entry_timestamp: new Date(candle.timestamp).toISOString(),
        exit_timestamp: result.exit_timestamp ? new Date(result.exit_timestamp).toISOString() : null,
        rsi: indicators.rsi,
        macd: indicators.macd.macd,
        ema20: indicators.ema20,
        ema50: indicators.ema50,
        result: result.result,
        pnl_percent: result.pnl_percent,
        confidence: signal.confidence,
        pattern_name: signal.pattern_name
      });

      signalsTested++;
    }

    console.log(`[backtest-signals] Generated ${signalsTested} test signals`);

    // STEP 4: Insérer tous les signaux
    if (signals.length > 0) {
      const { error: signalsError } = await supabase
        .from('backtest_signals')
        .insert(signals);

      if (signalsError) {
        console.error('[backtest-signals] Error inserting signals:', signalsError);
      }
    }

    // STEP 5: Calculer métriques
    const { data: metricsData } = await supabase
      .rpc('calculate_backtest_metrics', { p_backtest_id: backtestId });

    console.log('[backtest-signals] Metrics:', metricsData);

    // STEP 6: Mettre à jour backtest_results
    await supabase
      .from('backtest_results')
      .update({
        signals_tested: metricsData.signals_tested,
        signals_win: metricsData.signals_win,
        signals_loss: metricsData.signals_loss,
        winrate: metricsData.winrate,
        avg_profit: metricsData.avg_profit,
        avg_loss: metricsData.avg_loss,
        best_pattern: metricsData.best_pattern,
        best_pattern_winrate: metricsData.best_pattern_winrate,
        worst_pattern: metricsData.worst_pattern,
        worst_pattern_winrate: metricsData.worst_pattern_winrate
      })
      .eq('id', backtestId);

    // STEP 7: Mettre à jour risk manager
    await supabase.rpc('update_risk_allocation', {
      p_symbol: 'BTCUSDT',
      p_recent_winrate: metricsData.winrate
    });

    console.log('[backtest-signals] Backtest completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        backtest_id: backtestId,
        symbol: 'BTCUSDT',
        tested_days: 30,
        signals_tested: metricsData.signals_tested,
        winrate: metricsData.winrate,
        avg_profit: metricsData.avg_profit,
        avg_loss: metricsData.avg_loss,
        best_pattern: metricsData.best_pattern,
        worst_pattern: metricsData.worst_pattern,
        latency_ms: Date.now() - startTime
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[backtest-signals] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Récupère données OHLC historiques
 */
async function fetchHistoricalData(days: number): Promise<OHLCData[]> {
  // Try CoinGecko first (timeout 30s)
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('[backtest] CoinGecko success:', data.prices?.length, 'candles');
      return data.prices.map((p: any, i: number) => ({
        timestamp: p[0],
        open: p[1],
        high: p[1] * 1.005,
        low: p[1] * 0.995,
        close: p[1],
        volume: data.total_volumes[i]?.[1] || 1000000
      }));
    }
  } catch (e) {
    console.warn('[backtest] CoinGecko failed:', e.message);
  }

  // Fallback: Binance (timeout 30s)
  try {
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=1000`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    console.log('[backtest] Binance success');

    const klines = await response.json();
    return klines.map((k: any) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (e) {
    console.error('[backtest] Binance failed:', e.message);
    throw new Error('Failed to fetch historical data from both CoinGecko and Binance');
  }
}

/**
 * Générer signal de backtest
 */
function generateBacktestSignal(price: number, indicators: any, recentCandles: OHLCData[]): any {
  const { rsi, macd, ema20, ema50 } = indicators;

  // Sentiment volume
  const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
  const currentVolume = recentCandles[recentCandles.length - 1].volume;
  const volumeRatio = currentVolume / avgVolume;

  // Déterminer signal
  let signalType = 'WAIT';
  let confidence = 50;
  let pattern = '';

  // BUY conditions
  if (rsi < 40 && macd.histogram > 0 && price > ema50 && volumeRatio > 1.1) {
    signalType = 'BUY';
    confidence = 70 + (40 - rsi);
    pattern = 'RSI_oversold_MACD_bullish_EMA_uptrend';
  }
  // SELL conditions
  else if (rsi > 60 && macd.histogram < 0 && price < ema50) {
    signalType = 'SELL';
    confidence = 70 + (rsi - 60);
    pattern = 'RSI_overbought_MACD_bearish_EMA_downtrend';
  }

  const tp = signalType === 'BUY' ? price * 1.02 : signalType === 'SELL' ? price * 0.98 : price;
  const sl = signalType === 'BUY' ? price * 0.99 : signalType === 'SELL' ? price * 1.01 : price;

  return {
    signal_type: signalType,
    entry_price: price,
    take_profit: tp,
    stop_loss: sl,
    confidence,
    pattern_name: pattern || 'neutral'
  };
}

/**
 * Simuler résultat du signal
 */
function simulateSignalResult(signal: any, futureCandles: OHLCData[], entryTimestamp: number): any {
  if (signal.signal_type === 'WAIT') {
    return { result: 'NEUTRAL', pnl_percent: 0, exit_price: signal.entry_price, exit_timestamp: null };
  }

  for (const candle of futureCandles) {
    if (signal.signal_type === 'BUY') {
      if (candle.high >= signal.take_profit) {
        return {
          result: 'WIN',
          pnl_percent: ((signal.take_profit - signal.entry_price) / signal.entry_price) * 100,
          exit_price: signal.take_profit,
          exit_timestamp: candle.timestamp
        };
      }
      if (candle.low <= signal.stop_loss) {
        return {
          result: 'LOSS',
          pnl_percent: ((signal.stop_loss - signal.entry_price) / signal.entry_price) * 100,
          exit_price: signal.stop_loss,
          exit_timestamp: candle.timestamp
        };
      }
    } else if (signal.signal_type === 'SELL') {
      if (candle.low <= signal.take_profit) {
        return {
          result: 'WIN',
          pnl_percent: ((signal.entry_price - signal.take_profit) / signal.entry_price) * 100,
          exit_price: signal.take_profit,
          exit_timestamp: candle.timestamp
        };
      }
      if (candle.high >= signal.stop_loss) {
        return {
          result: 'LOSS',
          pnl_percent: ((signal.entry_price - signal.stop_loss) / signal.entry_price) * 100,
          exit_price: signal.stop_loss,
          exit_timestamp: candle.timestamp
        };
      }
    }
  }

  // Timeout après horizon
  const lastCandle = futureCandles[futureCandles.length - 1];
  const pnl = signal.signal_type === 'BUY'
    ? ((lastCandle.close - signal.entry_price) / signal.entry_price) * 100
    : ((signal.entry_price - lastCandle.close) / signal.entry_price) * 100;

  return {
    result: pnl > 0 ? 'WIN' : 'LOSS',
    pnl_percent: pnl,
    exit_price: lastCandle.close,
    exit_timestamp: lastCandle.timestamp
  };
}

// Indicateurs (même code que generate-btc-signal)
function calculateIndicators(prices: number[]) {
  return {
    rsi: calculateRSI(prices, 14),
    macd: calculateMACD(prices),
    ema20: calculateEMA(prices, 20),
    ema50: calculateEMA(prices, 50),
    atr: calculateATR(prices)
  };
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
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
  return { macd, signal, histogram: macd - signal };
}

function calculateATR(prices: number[]): number {
  const changes = prices.map((p, i) => i > 0 ? Math.abs(p - prices[i - 1]) : 0);
  return changes.reduce((a, b) => a + b, 0) / changes.length;
}
