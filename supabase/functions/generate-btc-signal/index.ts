import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { buildExtendedPrompt } from './prompt-extended.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * GENERATE-BTC-SIGNAL - ADVANCED VERSION
 * Uses Claude 3.5 Sonnet with comprehensive market analysis
 * Generates BUY, SELL, or WAIT signals based on multi-factor analysis
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  let claudeRequestId = '';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    console.log('[generate-btc-signal] Starting signal generation...');

    // STEP 1: Fetch latest market data from scan-market cache
    const { data: scanData } = await supabase
      .from('api_cache')
      .select('response_data, fetched_at')
      .eq('api_name', 'scan_market_btc')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let marketData: any;
    let newsData: any = { count: 0, sentiment: 'neutral', headlines: [] };
    let onChainData: any = {};

    if (scanData && scanData.response_data) {
      marketData = scanData.response_data.market;
      newsData = scanData.response_data.news || newsData;
      onChainData = scanData.response_data.onchain || onChainData;
      console.log('[generate-btc-signal] Using cached scan data');
    } else {
      // Fallback: fetch from Binance directly
      console.log('[generate-btc-signal] No scan data, fetching from Binance...');
      const binanceData = await fetchBinanceData();
      marketData = {
        price: parseFloat(binanceData.lastPrice),
        change24h: parseFloat(binanceData.priceChangePercent),
        volume24h: parseFloat(binanceData.volume),
        high24h: parseFloat(binanceData.highPrice),
        low24h: parseFloat(binanceData.lowPrice)
      };
    }

    // STEP 2: Fetch historical klines for technical analysis
    const klines = await fetchKlines();
    const prices = klines.map((k: any) => parseFloat(k[4])); // Close prices

    // STEP 3: Calculate technical indicators
    const indicators = calculateIndicators(prices, marketData.price);

    // STEP 4: Get reputation score
    const { data: reputation } = await supabase
      .from('reputation')
      .select('reputation_score, success_rate')
      .eq('symbol', 'BTCUSDT')
      .maybeSingle();

    const reputationScore = reputation?.reputation_score || 50;
    const successRate = reputation?.success_rate || 50;

    // STEP 5: Build comprehensive prompt
    const prompt = buildExtendedPrompt({
      market: marketData,
      indicators,
      reputation: reputationScore,
      successRate,
      cachedApis: [
        { api_name: 'cryptopanic', response_data: newsData.headlines || [] },
        { api_name: 'santiment', response_data: onChainData }
      ],
      riskProfile: 'modéré',
      capital: 10000
    });

    console.log(`[generate-btc-signal] Prompt length: ${prompt.length} chars`);

    // STEP 6: Call Claude AI
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    claudeRequestId = claudeData.id || '';
    const responseText = claudeData.content[0].text;

    console.log('[generate-btc-signal] Claude response:', responseText);

    // STEP 7: Parse JSON response
    let signal: any;
    try {
      // Remove markdown formatting if present
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      signal = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[generate-btc-signal] Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse signal JSON from Claude');
    }

    // STEP 8: Validate signal
    if (!signal.symbol || !signal.signal_type || signal.confidence === undefined) {
      throw new Error('Invalid signal structure from Claude');
    }

    // Ensure TP != entry_price
    if (signal.take_profit === signal.entry_price) {
      if (signal.signal_type === 'BUY') {
        signal.take_profit = signal.entry_price * 1.02; // +2%
      } else if (signal.signal_type === 'SELL') {
        signal.take_profit = signal.entry_price * 0.98; // -2%
      }
    }

    // STEP 9: Store signal in database
    const { data: insertedSignal, error: insertError } = await supabase
      .from('crypto_signals')
      .insert({
        symbol: signal.symbol,
        signal_type: signal.signal_type,
        confidence: signal.confidence,
        entry_price: signal.entry_price,
        take_profit: signal.take_profit,
        stop_loss: signal.stop_loss,
        horizon_minutes: signal.horizon_minutes || 240,
        reason: JSON.stringify(signal.reason),
        status: 'active',
        user_id: '00000000-0000-0000-0000-000000000000' // System generated
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-btc-signal] Failed to insert signal:', insertError);
    }

    // STEP 10: Log function call
    await supabase.from('function_logs').insert({
      function_name: 'generate-btc-signal',
      model_name: 'claude-3-5-sonnet-20240620',
      request_id: claudeRequestId,
      prompt_length: prompt.length,
      response_length: responseText.length,
      confidence: signal.confidence,
      signal_type: signal.signal_type,
      success: true,
      latency_ms: Date.now() - startTime
    });

    console.log(`[generate-btc-signal] Signal generated: ${signal.signal_type} @ ${signal.confidence}% confidence`);

    return new Response(
      JSON.stringify({
        success: true,
        signal,
        market_data: marketData,
        indicators,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-btc-signal] Error:', error);

    // Log error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase.from('function_logs').insert({
        function_name: 'generate-btc-signal',
        model_name: 'claude-3-5-sonnet-20240620',
        request_id: claudeRequestId,
        success: false,
        error_message: error.message,
        latency_ms: Date.now() - startTime
      });
    } catch (logError) {
      console.error('[generate-btc-signal] Failed to log error:', logError);
    }

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

/**
 * Fetch latest BTC price from Binance
 */
async function fetchBinanceData(): Promise<any> {
  const urls = [
    'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
    'https://api-gateway.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
    'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT'
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log(`[Binance] URL failed: ${url}`);
    }
  }

  throw new Error('Failed to fetch Binance data');
}

/**
 * Fetch historical klines from Binance
 */
async function fetchKlines(): Promise<any[]> {
  const urls = [
    'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100',
    'https://api-gateway.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100',
    'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100'
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length >= 50) {
          return data;
        }
      }
    } catch (error) {
      console.log(`[Klines] URL failed: ${url}`);
    }
  }

  throw new Error('Failed to fetch klines data');
}

/**
 * Calculate technical indicators
 */
function calculateIndicators(prices: number[], currentPrice: number) {
  const rsi = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);
  const ema20 = calculateEMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);

  // Volume is approximated from price changes
  const volumes = prices.map((p, i) => i > 0 ? Math.abs(p - prices[i - 1]) : 0);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastVolume = volumes[volumes.length - 1];
  const volumeRatio = lastVolume / avgVolume;

  // Price change last hour
  const priceChange = prices.length > 1 ? ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100 : 0;

  // ATR (Average True Range) - simplified
  const highLow = prices.map((p, i) => i > 0 ? Math.abs(p - prices[i - 1]) : 0);
  const atr = highLow.reduce((a, b) => a + b, 0) / highLow.length;

  return {
    rsi,
    macd,
    ema20,
    ema50,
    volume: volumeRatio,
    priceChange,
    atr
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
  const signal = macd * 0.9; // Simplified signal line
  const histogram = macd - signal;

  return { macd, signal, histogram };
}
