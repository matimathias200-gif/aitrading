import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  volume: number;
  priceChange: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    // Fetch BTC price from Binance
    const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    if (!binanceResponse.ok) {
      throw new Error(`Binance API error: ${binanceResponse.status}`);
    }
    const binanceData = await binanceResponse.json();

    // Fetch historical data for indicators
    const klineUrl = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100';
    const klineResponse = await fetch(klineUrl);
    if (!klineResponse.ok) {
      throw new Error(`Binance klines API error: ${klineResponse.status}`);
    }
    const klines = await klineResponse.json();

    if (!Array.isArray(klines)) {
      throw new Error('Invalid klines response format');
    }

    if (klines.length < 50) {
      throw new Error(`Insufficient historical data: only ${klines.length} candles available`);
    }

    // Calculate technical indicators
    const closePrices = klines.map((k: any) => parseFloat(k[4]));
    const volumes = klines.map((k: any) => parseFloat(k[5]));
    const indicators = calculateIndicators(closePrices, volumes);

    // Fetch cached API data
    const { data: cachedApis } = await supabase
      .from('api_cache')
      .select('api_name, response_data, source, data')
      .in('api_name', ['coinmarketcap', 'coingecko', 'cryptopanic', 'santiment']);

    // Extract useful data from cached APIs
    let cmcPrice = 'N/A';
    let cgPrice = 'N/A';
    let newsCount = 0;
    let activeAddresses = 'N/A';
    let socialVolume = 'N/A';

    if (cachedApis) {
      const cmcCache = cachedApis.find(a => a.api_name === 'coinmarketcap' || a.source === 'cmc_listings');
      if (cmcCache) {
        const cmcData = cmcCache.response_data || cmcCache.data;
        if (Array.isArray(cmcData) && cmcData[0]) {
          cmcPrice = `$${cmcData[0].quote?.USD?.price?.toFixed(2) || 'N/A'}`;
        }
      }

      const cgCache = cachedApis.find(a => a.api_name === 'coingecko');
      if (cgCache) {
        const cgData = cgCache.response_data || cgCache.data;
        if (Array.isArray(cgData) && cgData[0]) {
          cgPrice = `$${cgData[0].current_price?.toFixed(2) || 'N/A'}`;
        }
      }

      const newsCache = cachedApis.find(a => a.api_name === 'cryptopanic' || a.source === 'cryptopanic_news');
      if (newsCache) {
        const newsData = newsCache.response_data || newsCache.data;
        newsCount = Array.isArray(newsData) ? newsData.length : 0;
      }

      const santimentCache = cachedApis.find(a => a.api_name === 'santiment' || a.source === 'santiment_onchain_bitcoin');
      if (santimentCache) {
        const santimentData = santimentCache.response_data || santimentCache.data;
        if (santimentData) {
          activeAddresses = santimentData.daily_active_addresses || santimentData.getMetric?.timeseriesData?.[0]?.value || 'N/A';
          socialVolume = santimentData.social_volume || santimentData.socialVolume?.timeseriesData?.[0]?.value || 'N/A';
        }
      }
    }

    // Build prompt for Claude AI
    const prompt = `Tu es un expert en trading de cryptomonnaies. Analyse les données suivantes et génère un signal de trading pour Bitcoin (BTC).

DONNÉES DE MARCHÉ:
- Prix actuel: $${parseFloat(binanceData.lastPrice).toFixed(2)}
- Variation 24h: ${parseFloat(binanceData.priceChangePercent).toFixed(2)}%
- Volume 24h: ${parseFloat(binanceData.volume).toFixed(0)} BTC
- Plus haut 24h: $${parseFloat(binanceData.highPrice).toFixed(2)}
- Plus bas 24h: $${parseFloat(binanceData.lowPrice).toFixed(2)}

INDICATEURS TECHNIQUES:
- RSI (14): ${indicators.rsi.toFixed(2)}
- MACD: ${indicators.macd.macd.toFixed(2)}
- MACD Signal: ${indicators.macd.signal.toFixed(2)}
- MACD Histogram: ${indicators.macd.histogram.toFixed(2)}
- EMA 20: $${indicators.ema20.toFixed(2)}
- EMA 50: $${indicators.ema50.toFixed(2)}
- Volume relatif: ${(indicators.volume * 100).toFixed(0)}%
- Variation prix: ${indicators.priceChange.toFixed(2)}%

DONNÉES SUPPLÉMENTAIRES:
- Prix CoinGecko: ${cgPrice}
- Actualités récentes: ${newsCount} articles
- Adresses actives: ${activeAddresses}
- Volume social: ${socialVolume}

Donne UNIQUEMENT une réponse JSON structurée comme suit (sans markdown, sans backticks):
{
  "signal_type": "BUY" ou "SELL" ou "WAIT",
  "confidence": nombre entre 0 et 100,
  "entry_price": prix d'entrée suggéré,
  "take_profit": prix de take profit,
  "stop_loss": prix de stop loss,
  "horizon_minutes": durée estimée du signal en minutes,
  "reason": {
    "explain": "explication détaillée en français",
    "indicators": ["liste", "des", "indicateurs", "clés"]
  }
}`;

    // Call Claude AI
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1200,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const aiResponseText = claudeData.content[0].text;

    // Parse AI response (handle potential markdown wrapping)
    let signalData;
    try {
      const cleanedText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      signalData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', aiResponseText);
      throw new Error(`Invalid JSON response from Claude AI: ${parseError.message}`);
    }

    // Validate signal structure
    if (!signalData.signal_type || !['BUY', 'SELL', 'WAIT'].includes(signalData.signal_type)) {
      throw new Error('Invalid signal_type from Claude AI');
    }

    // Store signal in database (only if not WAIT)
    if (signalData.signal_type !== 'WAIT') {
      const { error: insertError } = await supabase
        .from('crypto_signals')
        .insert({
          symbol: 'BTCUSDT',
          signal_type: signalData.signal_type,
          entry_price: signalData.entry_price,
          take_profit: signalData.take_profit,
          stop_loss: signalData.stop_loss,
          confidence: signalData.confidence,
          reason: signalData.reason,
          horizon_minutes: signalData.horizon_minutes,
          status: 'active',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting signal:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal: signalData,
        market_data: {
          price: parseFloat(binanceData.lastPrice),
          change_24h: parseFloat(binanceData.priceChangePercent),
          volume_24h: parseFloat(binanceData.volume)
        },
        indicators,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-btc-signal:', error);
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
// TECHNICAL INDICATORS CALCULATIONS
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
  const signal = macd * 0.9;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}