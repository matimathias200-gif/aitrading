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