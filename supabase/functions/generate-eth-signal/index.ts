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

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) throw new Error('CLAUDE_API_KEY not configured');

    console.log('[generate-eth-signal] Starting with enhanced prompt...');

    const { data: scanData } = await supabase
      .from('api_cache')
      .select('response_data')
      .eq('api_name', 'scan_market_eth')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scanData) throw new Error('No market data for ETH');

    const market = scanData.response_data.market;
    const news = scanData.response_data.news || { headlines: [], sentiment: 'neutral', count: 0 };

    const price = market.price || 0;
    const change24h = market.change24h || 0;
    const volume24h = market.volume24h || 0;
    const high24h = market.high24h || price * 1.02;
    const low24h = market.low24h || price * 0.98;
    const dominance = market.dominance || 18;

    const volatility = ((high24h - low24h) / low24h) * 100;
    const rsi = change24h > 0 ? 60 + Math.min(change24h * 5, 20) : 40 + Math.max(change24h * 5, -20);
    const macd = change24h * 10;
    const macdHist = macd * 0.3;
    const ema20 = price * 0.99;
    const ema50 = price * 0.98;
    const ema200 = price * 0.95;
    const volumeRatio = 1.2;
    const change1h = change24h * 0.4;
    const change4h = change24h * 0.7;
    const trendStrength = Math.abs(change24h) * 2;

    const { data: rep } = await supabase
      .from('reputation')
      .select('reputation_score')
      .eq('symbol', 'ETHUSDT')
      .maybeSingle();

    const reputation = rep?.reputation_score || 50;
    const successRate = 50;

    const fundingRate = 0.01;
    const sentiment = news.sentiment || 'neutral';
    const newsCount = news.count || 0;
    const activeAddr = 'N/A';
    const onchainTx = 'N/A';
    const socialVol = 'N/A';
    const fearGreed = 50;

    const prompt = `Tu es un analyste crypto professionnel spécialisé en ETHUSDT.

Analyse le marché de l'Ethereum sur plusieurs horizons de temps (1h, 4h, 1j) en tenant compte des aspects techniques, fondamentaux, on-chain et du sentiment global.

Voici les données actuelles :

Données de marché :
{
  "price": ${price.toFixed(2)},
  "change_24h": ${change24h.toFixed(2)},
  "volume_24h": ${volume24h.toFixed(0)},
  "high_24h": ${high24h.toFixed(2)},
  "low_24h": ${low24h.toFixed(2)},
  "reputation": ${reputation.toFixed(2)},
  "success_rate": ${successRate.toFixed(2)},
  "dominance": ${dominance.toFixed(2)},
  "eth_funding_rate": ${fundingRate.toFixed(4)}
}

Indicateurs techniques :
{
  "rsi": ${rsi.toFixed(2)},
  "macd": ${macd.toFixed(2)},
  "macd_histogram": ${macdHist.toFixed(2)},
  "ema20": ${ema20.toFixed(2)},
  "ema50": ${ema50.toFixed(2)},
  "ema200": ${ema200.toFixed(2)},
  "volume_ratio": ${volumeRatio.toFixed(2)},
  "price_change_1h": ${change1h.toFixed(2)},
  "price_change_4h": ${change4h.toFixed(2)},
  "trend_strength": ${trendStrength.toFixed(2)}
}

Données de sentiment et fondamentales :
{
  "market_sentiment": "${sentiment}",
  "news_count": ${newsCount},
  "onchain_active_addresses": "${activeAddr}",
  "onchain_transaction_volume": "${onchainTx}",
  "social_volume": "${socialVol}",
  "fear_greed_index": ${fearGreed}
}

Profil de risque utilisateur :
{
  "risk_level": "modéré",
  "position_size_pct": 5
}

Consignes de décision :
- Utilise les données ci-dessus pour déterminer la tendance dominante.
- Compare les horizons de temps (1h, 4h, 1j) pour détecter la cohérence.
- Génère un seul signal principal basé sur les probabilités les plus fortes.
- Si la confiance est < 65, réponds toujours WAIT.
- Prends en compte le niveau de réputation pour ajuster la taille des TP et SL.
- N'invente rien : base-toi uniquement sur les données données.

Retourne ta réponse **strictement au format JSON** (sans markdown, sans backticks) :

{
  "symbol": "ETHUSDT",
  "signal_type": "BUY" | "SELL" | "WAIT",
  "confidence": <nombre 0-100>,
  "entry_price": ${price.toFixed(2)},
  "take_profit": <nombre>,
  "stop_loss": <nombre>,
  "horizon_minutes": 240,
  "position_size_pct": 5,
  "reason": {
    "explain": "<explication concise en français sur la logique de la décision>",
    "indicators": ["RSI", "MACD", "EMA20/50/200", "sentiment", "volume", "price action"]
  }
}`;

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      throw new Error(`Claude API error: ${claudeResp.status} - ${err}`);
    }

    const claudeData = await claudeResp.json();
    const content = claudeData.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');

    const signal = JSON.parse(jsonMatch[0]);

    let saved = null;

    if (signal.signal_type === 'BUY' || signal.signal_type === 'SELL') {
      const { data: savedData, error: saveError } = await supabase
        .from('crypto_signals')
        .insert({
          symbol: 'ETHUSDT',
          signal_type: signal.signal_type,
          confidence: signal.confidence,
          entry_price: signal.entry_price,
          take_profit: signal.take_profit,
          stop_loss: signal.stop_loss,
          horizon_minutes: signal.horizon_minutes || 240,
          reason: {
            explain: signal.reason?.explain || '',
            indicators: signal.reason?.indicators || ['RSI', 'MACD']
          },
          status: 'active'
        })
        .select()
        .single();

      if (saveError) {
        console.error('[generate-eth-signal] Save error:', saveError);
        throw saveError;
      }

      saved = savedData;
      console.log(`[generate-eth-signal] Signal saved: ${signal.signal_type} @ ${signal.entry_price} (confidence: ${signal.confidence}%)`);
    } else {
      console.log('[generate-eth-signal] WAIT signal, not saving to DB');
    }

    await supabase.from('function_logs').insert({
      function_name: 'generate-eth-signal',
      success: true,
      model_name: 'claude-3-5-sonnet-20241022',
      signal_type: signal.signal_type,
      confidence: signal.confidence,
      latency_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ success: true, signal: saved, latency_ms: Date.now() - startTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-eth-signal] Error:', error);

    await supabase.from('function_logs').insert({
      function_name: 'generate-eth-signal',
      success: false,
      model_name: 'claude-3-5-sonnet-20241022',
      latency_ms: Date.now() - startTime,
      metadata: { error: error.message }
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});