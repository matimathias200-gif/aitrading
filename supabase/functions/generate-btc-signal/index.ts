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

    const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    if (!binanceResponse.ok) {
      throw new Error(`Binance API error: ${binanceResponse.status}`);
    }
    const binanceData = await binanceResponse.json();

    const klineUrl = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100';
    const klineResponse = await fetch(klineUrl);
    if (!klineResponse.ok) {
      throw new Error(`Binance klines API error: ${klineResponse.status}`);
    }
    const klines = await klineResponse.json();

    if (!Array.isArray(klines) || klines.length < 50) {
      throw new Error(`Insufficient historical data`);
    }

    const closePrices = klines.map((k: any) => parseFloat(k[4]));
    const volumes = klines.map((k: any) => parseFloat(k[5]));
    const indicators = calculateIndicators(closePrices, volumes);

    const { data: reputation } = await supabase
      .from('crypto_reputation')
      .select('reputation_score, success_rate, total_trades')
      .eq('symbol', 'BTCUSDT')
      .single();

    const reputationScore = reputation?.reputation_score || 50;
    const successRate = reputation?.success_rate || 50;

    const { data: cachedApis } = await supabase
      .from('api_cache')
      .select('api_name, response_data, source, data')
      .in('api_name', ['coinmarketcap', 'coingecko', 'cryptopanic', 'santiment']);

    let newsCount = 0;
    let newsSentiment = 'neutral';
    let activeAddresses = 'N/A';
    let socialVolume = 'N/A';

    if (cachedApis) {
      const newsCache = cachedApis.find(a => a.api_name === 'cryptopanic' || a.source === 'cryptopanic_news');
      if (newsCache) {
        const newsData = newsCache.response_data || newsCache.data;
        newsCount = Array.isArray(newsData) ? newsData.length : 0;
        if (Array.isArray(newsData)) {
          const positive = newsData.filter((n: any) => n.votes?.positive > n.votes?.negative).length;
          const negative = newsData.filter((n: any) => n.votes?.negative > n.votes?.positive).length;
          if (positive > negative * 1.5) newsSentiment = 'bullish';
          else if (negative > positive * 1.5) newsSentiment = 'bearish';
        }
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

    const currentPrice = parseFloat(binanceData.lastPrice);
    const change24h = parseFloat(binanceData.priceChangePercent);
    const volume24h = parseFloat(binanceData.volume);

    const prompt = `Tu es un analyste crypto professionnel.\nAnalyse le marché du Bitcoin (BTC/USDT) sur les horizons 1h, 4h, 1j.\n\nDonnées de marché:\n{\n  "last": ${currentPrice.toFixed(2)},\n  "change24h": ${change24h.toFixed(2)},\n  "volume24h": ${volume24h.toFixed(0)},\n  "high24h": ${parseFloat(binanceData.highPrice).toFixed(2)},\n  "low24h": ${parseFloat(binanceData.lowPrice).toFixed(2)},\n  "reputation": ${reputationScore.toFixed(2)},\n  "success_rate": ${successRate.toFixed(2)}\n}\n\nIndicateurs techniques:\n{\n  "rsi": ${indicators.rsi.toFixed(2)},\n  "macd": ${indicators.macd.macd.toFixed(2)},\n  "macd_histogram": ${indicators.macd.histogram.toFixed(2)},\n  "ema20": ${indicators.ema20.toFixed(2)},\n  "ema50": ${indicators.ema50.toFixed(2)},\n  "volume_ratio": ${indicators.volume.toFixed(2)},\n  "price_change_1h": ${indicators.priceChange.toFixed(2)}\n}\n\nContexte additionnel:\n{\n  "risk_profile": "modéré",\n  "market_sentiment": "${newsSentiment}",\n  "news_count": ${newsCount},\n  "active_addresses": "${activeAddresses}",\n  "social_volume": "${socialVolume}"\n}\n\nFournis une réponse strictement au format JSON suivant (sans markdown, sans backticks):\n{\n  "symbol": "BTCUSDT",\n  "signal_type": "BUY" | "SELL" | "WAIT",\n  "confidence": 0-100,\n  "entry_price": <prix_entrée>,\n  "take_profit": <prix_tp>,\n  "stop_loss": <prix_sl>,\n  "horizon_minutes": <durée_estimée>,\n  "reason": {\n    "explain": "<explication brève en français>",\n    "indicators": ["liste", "des", "indicateurs", "clés"]\n  }\n}\n\nRègles strictes:\n1. Ne JAMAIS renvoyer take_profit = entry_price\n2. BUY/SELL uniquement si confidence > 65\n3. Adapter TP/SL selon reputation_score (${reputationScore.toFixed(0)})\n4. Si reputation < 50: TP/SL plus serrés (-20%)\n5. Si reputation > 70: TP/SL plus larges (+20%)\n6. Si aucune opportunité claire: renvoyer WAIT\n7. TP doit être > entry_price pour BUY, < entry_price pour SELL\n8. SL doit être < entry_price pour BUY, > entry_price pour SELL`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const aiResponseText = claudeData.content[0].text;

    let signalData;
    try {
      const cleanedText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      signalData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', aiResponseText);
      throw new Error(`Invalid JSON response from Claude AI: ${parseError.message}`);
    }

    if (!signalData.signal_type || !['BUY', 'SELL', 'WAIT'].includes(signalData.signal_type)) {
      throw new Error('Invalid signal_type from Claude AI');
    }

    if (signalData.signal_type === 'BUY' && signalData.take_profit <= signalData.entry_price) {
      signalData.take_profit = signalData.entry_price * 1.03;
    }
    if (signalData.signal_type === 'SELL' && signalData.take_profit >= signalData.entry_price) {
      signalData.take_profit = signalData.entry_price * 0.97;
    }

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

      if (insertError) console.error('Error inserting signal:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal: signalData,
        market_data: {
          price: currentPrice,
          change_24h: change24h,
          volume_24h: volume24h,
          reputation_score: reputationScore,
          success_rate: successRate
        },
        indicators,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-btc-signal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, timestamp: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
  return { rsi, macd, ema20, ema50, volume: currentVolume / avgVolume, priceChange };
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change; else losses -= change;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) ema = (prices[i] - ema) * multiplier + ema;
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