import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    // Fetch market data from Binance
    const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const allTickers = await binanceResponse.json();

    const relevantTickers = allTickers.filter((ticker: any) => 
      symbols.includes(ticker.symbol)
    );

    const generatedSignals = [];

    // Process each crypto
    for (const ticker of relevantTickers) {
      try {
        // Fetch historical data
        const klineUrl = `https://api.binance.com/api/v3/klines?symbol=${ticker.symbol}&interval=1h&limit=50`;
        const klineResponse = await fetch(klineUrl);
        const klines = await klineResponse.json();

        if (!Array.isArray(klines) || klines.length < 30) continue;

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
            model: 'claude-3-5-sonnet-20241022',
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