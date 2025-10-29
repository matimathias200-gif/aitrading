import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * SCAN-MARKET - BTC ONLY SPECIALIZATION (3 MONTHS)
 * Scans Bitcoin market every 10 minutes
 * Combines all external APIs: CoinGecko, CoinMarketCap, CryptoPanic, Santiment
 * Uses Claude Haiku for fast analysis
 */

interface MarketData {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  dominance?: number;
}

interface OnChainData {
  activeAddresses?: string;
  exchangeInflow?: string;
  exchangeOutflow?: string;
  socialVolume?: string;
}

interface NewsData {
  count: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  headlines: string[];
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

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    console.log('[scan-market] Starting BTC ONLY scan...');

    // STEP 1: Fetch market data from CoinGecko
    const marketData = await fetchCoinGeckoData();

    // STEP 2: Fetch market cap & dominance from CoinMarketCap
    const cmcData = await fetchCoinMarketCapData();

    // STEP 3: Fetch news & sentiment from CryptoPanic
    const newsData = await fetchCryptoPanicData();

    // STEP 4: Fetch on-chain metrics from Santiment
    const onChainData = await fetchSantimentData();

    // STEP 5: Combine all data
    const combinedData = {
      market: {
        ...marketData,
        marketCap: cmcData.marketCap,
        dominance: cmcData.dominance
      },
      onchain: onChainData,
      news: newsData,
      timestamp: new Date().toISOString()
    };

    console.log('[scan-market] Combined data:', JSON.stringify(combinedData, null, 2));

    // STEP 6: Store in cache
    await supabase.from('api_cache').upsert({
      api_name: 'scan_market_btc',
      source: 'combined',
      response_data: combinedData,
      fetched_at: new Date().toISOString()
    });

    // STEP 7: Analyze with Claude Haiku (fast)
    const analysis = await analyzeWithClaude(combinedData, claudeApiKey);

    // STEP 8: Log function call
    await supabase.from('function_logs').insert({
      function_name: 'scan-market',
      model_name: 'claude-3-haiku-20240307',
      success: true,
      latency_ms: Date.now() - startTime,
      metadata: { symbol: 'BTCUSDT', analysis }
    });

    console.log('[scan-market] Scan completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        symbol: 'BTCUSDT',
        data: combinedData,
        analysis,
        latency_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scan-market] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Fetch Bitcoin data from CoinGecko
 */
async function fetchCoinGeckoData(): Promise<MarketData> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const btc = data.bitcoin;

    return {
      price: btc.usd,
      change24h: btc.usd_24h_change || 0,
      volume24h: btc.usd_24h_vol || 0,
      high24h: btc.usd * (1 + Math.abs(btc.usd_24h_change || 0) / 100),
      low24h: btc.usd * (1 - Math.abs(btc.usd_24h_change || 0) / 100),
      marketCap: btc.usd_market_cap
    };
  } catch (error) {
    console.error('[CoinGecko] Error:', error);
    throw new Error('Failed to fetch CoinGecko data');
  }
}

/**
 * Fetch market cap & dominance from CoinMarketCap
 */
async function fetchCoinMarketCapData(): Promise<{ marketCap?: number; dominance?: number }> {
  try {
    const apiKey = Deno.env.get('CMC_API_KEY');
    if (!apiKey) {
      console.warn('[CMC] API key not configured, skipping');
      return {};
    }

    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC';
    const response = await fetch(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`[CMC] API error: ${response.status}`);
      return {};
    }

    const data = await response.json();
    const btc = data.data.BTC;

    return {
      marketCap: btc.quote.USD.market_cap,
      dominance: btc.quote.USD.market_cap_dominance
    };
  } catch (error) {
    console.warn('[CMC] Error:', error);
    return {};
  }
}

/**
 * Fetch news & sentiment from CryptoPanic
 */
async function fetchCryptoPanicData(): Promise<NewsData> {
  try {
    const apiKey = Deno.env.get('CRYPTOPANIC_API_KEY');
    if (!apiKey) {
      console.warn('[CryptoPanic] API key not configured, skipping');
      return { count: 0, sentiment: 'neutral', headlines: [] };
    }

    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}&currencies=BTC&filter=hot&public=true`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[CryptoPanic] API error: ${response.status}`);
      return { count: 0, sentiment: 'neutral', headlines: [] };
    }

    const data = await response.json();
    const posts = data.results || [];

    const headlines = posts.slice(0, 5).map((p: any) => p.title);
    const positive = posts.filter((p: any) => p.votes?.positive > p.votes?.negative).length;
    const negative = posts.filter((p: any) => p.votes?.negative > p.votes?.positive).length;

    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (positive > negative * 1.5) sentiment = 'bullish';
    else if (negative > positive * 1.5) sentiment = 'bearish';

    return {
      count: posts.length,
      sentiment,
      headlines
    };
  } catch (error) {
    console.warn('[CryptoPanic] Error:', error);
    return { count: 0, sentiment: 'neutral', headlines: [] };
  }
}

/**
 * Fetch on-chain metrics from Santiment
 */
async function fetchSantimentData(): Promise<OnChainData> {
  try {
    const apiKey = Deno.env.get('SANTIMENT_API_KEY');
    if (!apiKey) {
      console.warn('[Santiment] API key not configured, skipping');
      return {};
    }

    // Note: Santiment requires GraphQL queries, this is a simplified version
    // You would need to implement proper GraphQL queries for production
    return {
      activeAddresses: 'N/A',
      exchangeInflow: 'N/A',
      exchangeOutflow: 'N/A',
      socialVolume: 'N/A'
    };
  } catch (error) {
    console.warn('[Santiment] Error:', error);
    return {};
  }
}

/**
 * Analyze market data with Claude Haiku
 */
async function analyzeWithClaude(data: any, apiKey: string): Promise<string> {
  try {
    const prompt = `Analyze Bitcoin market data and provide a brief summary in French (2-3 sentences).

Market: Price ${data.market.price}, Change 24h: ${data.market.change24h}%
News Sentiment: ${data.news.sentiment} (${data.news.count} articles)
Headlines: ${data.news.headlines.join(', ')}

Provide only: current trend (bullish/bearish/neutral) + key reason.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.warn(`[Claude] API error: ${response.status}`);
      return 'Analysis unavailable';
    }

    const result = await response.json();
    return result.content[0].text;

  } catch (error) {
    console.error('[Claude] Error:', error);
    return 'Analysis failed';
  }
}
