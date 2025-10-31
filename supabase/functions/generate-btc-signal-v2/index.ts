import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * GENERATE-BTC-SIGNAL V2 - Avec règles strictes BUY/SELL
 * Utilise Claude Sonnet 4.0
 * Pattern learning automatique
 * Règles de sécurité anti-faux signaux
 */

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

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) throw new Error('CLAUDE_API_KEY not configured');

    console.log('[generate-btc-signal-v2] Starting...');

    // STEP 1: Get market data from cache
    const { data: scanData } = await supabase
      .from('api_cache')
      .select('response_data')
      .eq('api_name', 'scan_market_btc')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scanData) throw new Error('No market data in cache - run scan-market first');

    const marketData = scanData.response_data.market;
    const newsData = scanData.response_data.news;

    // STEP 2: Fetch klines
    const klines = await fetchKlines();
    const prices = klines.map((k: any) => parseFloat(k[4]));

    // STEP 3: Calculate indicators
    const indicators = calculateIndicators(prices);

    // STEP 4: Get reputation + patterns
    const { data: reputation } = await supabase
      .from('reputation')
      .select('reputation_score, success_rate')
      .eq('symbol', 'BTCUSDT')
      .maybeSingle();

    const reputationScore = reputation?.reputation_score || 50;
    const successRate = reputation?.success_rate || 50;

    // STEP 5: Build enhanced prompt with strict rules
    const currentPrice = parseFloat(marketData.price);
    const prompt = buildStrictPrompt(currentPrice, marketData, indicators, newsData, reputationScore, successRate);

    // STEP 6: Call Claude Sonnet 4.0
    console.log('[generate-btc-signal-v2] Calling Claude Sonnet 4.0...');
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content[0].text;

    // STEP 7: Parse signal
    let signal: any;
    try {
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      signal = JSON.parse(jsonText);
    } catch (e) {
      throw new Error('Failed to parse Claude response as JSON');
    }

    // STEP 8: RÈGLES DE SÉCURITÉ - Correction automatique
    signal = applySecurityRules(signal, currentPrice, indicators);

    // STEP 9: Generate pattern name
    const patternName = generatePatternName(indicators, newsData.sentiment);

    // STEP 10: Store signal
    await supabase.from('crypto_signals').insert({
      symbol: 'BTCUSDT',
      signal_type: signal.signal_type,
      confidence: signal.confidence,
      entry_price: signal.entry_price,
      take_profit: signal.take_profit,
      stop_loss: signal.stop_loss,
      horizon_minutes: signal.horizon_minutes || 240,
      reason: JSON.stringify({
        ...signal.reason,
        pattern: patternName
      }),
      status: 'active',
      user_id: '00000000-0000-0000-0000-000000000000'
    });

    // STEP 11: Log
    await supabase.from('function_logs').insert({
      function_name: 'generate-btc-signal-v2',
      model_name: 'claude-3-5-sonnet-20241022',
      signal_type: signal.signal_type,
      confidence: signal.confidence,
      success: true,
      latency_ms: Date.now() - startTime,
      metadata: { pattern: patternName }
    });

    console.log(`[generate-btc-signal-v2] Signal: ${signal.signal_type} @ ${signal.confidence}% (pattern: ${patternName})`);

    return new Response(
      JSON.stringify({
        success: true,
        signal,
        pattern: patternName,
        indicators,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-btc-signal-v2] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Prompt avec règles strictes BUY/SELL
 */
function buildStrictPrompt(
  currentPrice: number,
  market: any,
  indicators: any,
  news: any,
  reputation: number,
  successRate: number
): string {
  const change24h = market.change24h || 0;
  const volume24h = market.volume24h || 0;

  return `Tu es un analyste crypto expert. Analyse Bitcoin et génère UN signal de trading.

DONNÉES MARCHÉ:
- Prix actuel: ${currentPrice.toFixed(2)} USD
- Change 24h: ${change24h.toFixed(2)}%
- Volume 24h: ${volume24h.toFixed(0)} USD

INDICATEURS TECHNIQUES:
- RSI(14): ${indicators.rsi.toFixed(2)}
- MACD: ${indicators.macd.macd.toFixed(2)}
- MACD Signal: ${indicators.macd.signal.toFixed(2)}
- EMA20: ${indicators.ema20.toFixed(2)}
- EMA50: ${indicators.ema50.toFixed(2)}
- ATR: ${indicators.atr.toFixed(2)}

SENTIMENT NEWS: ${news.sentiment} (${news.count} articles)
RÉPUTATION SYSTÈME: ${reputation.toFixed(0)}/100 | Success Rate: ${successRate.toFixed(0)}%

RÈGLES STRICTES:

1. **SIGNAL BUY si ET SEULEMENT SI:**
   - RSI < 40 (survendu)
   - MACD > MACD_Signal (croisement haussier)
   - Prix > EMA50 OU (Prix proche EMA50 ET tendance haussière)
   - Volume 24h > moyenne
   - Sentiment news != "bearish"

2. **SIGNAL SELL si ET SEULEMENT SI:**
   - RSI > 70 (suracheté)
   - MACD < MACD_Signal (croisement baissier)
   - Prix < EMA50 OU (Prix proche EMA50 ET tendance baissière)
   - Sentiment news != "bullish"

3. **SIGNAL WAIT si:**
   - Conditions BUY/SELL non remplies
   - Confiance < 65%
   - Indicateurs contradictoires

4. **TP/SL OBLIGATOIRES:**
   - BUY: TP = entry + 2%, SL = entry - 1%
   - SELL: TP = entry - 2%, SL = entry + 1%
   - Ajuster selon volatilité (ATR)

5. **VALIDATION FINALE:**
   - TP DOIT être différent de entry_price
   - BUY: TP > entry, SL < entry
   - SELL: TP < entry, SL > entry

Réponds UNIQUEMENT en JSON (pas de markdown):
{
  "symbol": "BTCUSDT",
  "signal_type": "BUY" | "SELL" | "WAIT",
  "confidence": 0-100,
  "entry_price": ${currentPrice.toFixed(2)},
  "take_profit": <calculé>,
  "stop_loss": <calculé>,
  "horizon_minutes": 240,
  "position_size_pct": 5,
  "reason": {
    "explain": "<explication française 1-2 phrases>",
    "indicators": ["RSI", "MACD", "EMA"]
  }
}`;
}

/**
 * RÈGLES DE SÉCURITÉ - Correction automatique des signaux
 */
function applySecurityRules(signal: any, currentPrice: number, indicators: any): any {
  // Règle 1: Forcer SELL si RSI > 70 ET MACD baissier ET prix < EMA50
  if (indicators.rsi > 70 && indicators.macd.histogram < 0 && currentPrice < indicators.ema50) {
    if (signal.signal_type === 'BUY') {
      console.warn('[SECURITY] Forcing SELL (RSI>70, MACD bearish, price<EMA50)');
      signal.signal_type = 'SELL';
      signal.take_profit = currentPrice * 0.98;
      signal.stop_loss = currentPrice * 1.01;
    }
  }

  // Règle 2: Forcer BUY si RSI < 30 ET MACD haussier ET prix > EMA50
  if (indicators.rsi < 30 && indicators.macd.histogram > 0 && currentPrice > indicators.ema50) {
    if (signal.signal_type === 'SELL') {
      console.warn('[SECURITY] Forcing BUY (RSI<30, MACD bullish, price>EMA50)');
      signal.signal_type = 'BUY';
      signal.take_profit = currentPrice * 1.02;
      signal.stop_loss = currentPrice * 0.99;
    }
  }

  // Règle 3: TP ne peut PAS égaler entry
  if (signal.take_profit === signal.entry_price) {
    if (signal.signal_type === 'BUY') {
      signal.take_profit = signal.entry_price * 1.02;
    } else if (signal.signal_type === 'SELL') {
      signal.take_profit = signal.entry_price * 0.98;
    }
  }

  return signal;
}

/**
 * Générer nom de pattern pour apprentissage
 */
function generatePatternName(indicators: any, sentiment: string): string {
  const rsiZone = indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : 'neutral';
  const macdTrend = indicators.macd.histogram > 0 ? 'bullish' : 'bearish';
  const emaTrend = indicators.ema20 > indicators.ema50 ? 'uptrend' : 'downtrend';

  return `RSI_${rsiZone}_MACD_${macdTrend}_EMA_${emaTrend}_NEWS_${sentiment}`;
}

// Helpers (même code que v1)
async function fetchKlines() {
  const urls = [
    'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100',
    'https://api-gateway.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length >= 50) return data;
      }
    } catch (e) {}
  }
  throw new Error('Klines unreachable');
}

function calculateIndicators(prices: number[]) {
  const rsi = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);
  const ema20 = calculateEMA(prices, 20);
  const ema50 = calculateEMA(prices, 50);
  const highLow = prices.map((p, i) => i > 0 ? Math.abs(p - prices[i - 1]) : 0);
  const atr = highLow.reduce((a, b) => a + b, 0) / highLow.length;
  return { rsi, macd, ema20, ema50, atr };
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
