import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function fetchMarketDataWithFallback(supabase: any, symbols: string[]) {
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
          return { success: true, data: data.filter((t: any) => symbols.includes(t.symbol)), source: 'binance' };
        }
      }
    } catch (error) {
      console.log(`Binance market data URL failed: ${url}`);
    }
  }

  console.log('Binance unavailable, using cache fallback');
  const { data: cachedData } = await supabase
    .from('api_cache')
    .select('response_data, data')
    .or('source.eq.coingecko_markets,source.eq.cmc_listings')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (cachedData) {
    const cacheContent = cachedData.response_data || cachedData.data;
    const tickers = Array.isArray(cacheContent) ? cacheContent.filter((c: any) => symbols.includes(c.symbol + 'USDT')) : [];
    return {
      success: true,
      data: tickers.map((t: any) => ({
        symbol: t.symbol + 'USDT',
        lastPrice: (t.current_price || t.quote?.USD?.price || 0).toString(),
        priceChangePercent: (t.price_change_percentage_24h || t.quote?.USD?.percent_change_24h || 0).toString(),
        volume: (t.total_volume || t.quote?.USD?.volume_24h || 0).toString()
      })),
      source: 'cache'
    };
  }

  return { success: false, data: [], source: 'none' };
}

async function fetchKlinesWithFallback(symbol: string) {
  const BINANCE_URLS = [
    `https://api-gateway.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`
  ];

  for (const url of BINANCE_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length >= 30) {
          return { success: true, data };
        }
      }
    } catch (error) {
      console.log(`Klines URL failed for ${symbol}: ${url}`);
    }
  }

  return { success: false, data: [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get watchlist
    const { data: watchlist, error: watchlistError } = await supabase
      .from('crypto_watchlist')
      .select('symbol')
      .eq('is_active', true);

    if (watchlistError) throw watchlistError;

    const symbols = watchlist?.map(w => w.symbol) || [];
    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          signals: [], 
          message: 'No active symbols in watchlist' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch market data with fallback
    const marketResult = await fetchMarketDataWithFallback(supabase, symbols);
    if (!marketResult.success || marketResult.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          signals: [],
          message: 'No market data available from any source'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const relevantTickers = marketResult.data;
    console.log(`Market data fetched from: ${marketResult.source}, ${relevantTickers.length} tickers`);

    const generatedSignals = [];

    // Process each crypto
    for (const ticker of relevantTickers) {
      try {
        // Fetch historical data with fallback
        const klinesResult = await fetchKlinesWithFallback(ticker.symbol);
        if (!klinesResult.success || klinesResult.data.length < 30) continue;

        const klines = klinesResult.data;

        const closePrices = klines.map((k: any) => parseFloat(k[4]));
        const volumes = klines.map((k: any) => parseFloat(k[5]));
        
        const rsi = calculateRSI(closePrices, 14);
        const macd = calculateMACD(closePrices);
        const ema20 = calculateEMA(closePrices, 20);
        const price = parseFloat(ticker.lastPrice);
        const change24h = parseFloat(ticker.priceChangePercent);

        // Quick filter: only analyze if there's a strong signal
        const shouldAnalyze = (
          (rsi < 35 || rsi > 65) || // Oversold or overbought
          (Math.abs(macd.histogram) > 10) || // Strong MACD signal
          (Math.abs(change24h) > 3) // Significant price movement
        );

        if (!shouldAnalyze) continue;

        // Call Claude AI for analysis
        const prompt = `Analyse rapide de ${ticker.symbol}:
Prix: $${price.toFixed(2)} (${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%)
RSI: ${rsi.toFixed(1)}, MACD: ${macd.histogram.toFixed(2)}, EMA20: $${ema20.toFixed(2)}

Réponds en JSON (sans markdown):
{
  "signal_type": "BUY"/"SELL"/"WAIT",
  "confidence": 0-100,
  "entry_price": ${price},
  "take_profit": prix_tp,
  "stop_loss": prix_sl,
  "horizon_minutes": 60,
  "reason": {
    "explain": "bref",
    "indicators": ["liste"]
  }
}`;

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': claudeApiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet',
            max_tokens: 512,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!claudeResponse.ok) {
          console.error(`Claude API error for ${ticker.symbol}:`, claudeResponse.status);
          continue;
        }

        const claudeData = await claudeResponse.json();
        const aiResponseText = claudeData.content[0].text;

        let signalData;
        try {
          const cleanedText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          signalData = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error(`Parse error for ${ticker.symbol}:`, aiResponseText);
          continue;
        }

        // Only store actionable signals (BUY/SELL)
        if (signalData.signal_type !== 'WAIT') {
          const { error: insertError } = await supabase
            .from('crypto_signals')
            .insert({
              symbol: ticker.symbol,
              signal_type: signalData.signal_type,
              entry_price: signalData.entry_price,
              take_profit: signalData.take_profit,
              stop_loss: signalData.stop_loss,
              confidence: signalData.confidence,
              reason: signalData.reason,
              horizon_minutes: signalData.horizon_minutes || 60,
              status: 'active',
              created_at: new Date().toISOString()
            });

          if (!insertError) {
            generatedSignals.push({
              symbol: ticker.symbol,
              ...signalData
            });
          }
        }

      } catch (error) {
        console.error(`Error processing ${ticker.symbol}:`, error.message);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals: generatedSignals,
        scanned_count: relevantTickers.length,
        signals_generated: generatedSignals.length,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scan-market:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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