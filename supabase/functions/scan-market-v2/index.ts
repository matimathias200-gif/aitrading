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

    console.log('[scan-market-v2] Starting BTC & ETH scan with API logging...');

    const [btcResult, ethResult] = await Promise.all([
      scanAsset('bitcoin', 'BTC', 'BTCUSDT', supabase, claudeApiKey),
      scanAsset('ethereum', 'ETH', 'ETHUSDT', supabase, claudeApiKey)
    ]);

    console.log('[scan-market-v2] Scan completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          btc: btcResult,
          eth: ethResult
        },
        latency_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[scan-market-v2] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scanAsset(coinId: string, symbol: string, tradingPair: string, supabase: any, claudeApiKey: string) {
  const start = Date.now();

  try {
    const marketData = await loggedApiFetch(
      supabase,
      `CoinGecko-${symbol}`,
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
      async (res) => {
        const data = await res.json();
        const coin = data[coinId];
        return {
          price: coin.usd,
          change24h: coin.usd_24h_change || 0,
          volume24h: coin.usd_24h_vol || 0,
          marketCap: coin.usd_market_cap,
          high24h: coin.usd * 1.02,
          low24h: coin.usd * 0.98
        };
      }
    );

    let cmcData = { dominance: null };
    const cmcApiKey = Deno.env.get('CMC_API_KEY');
    if (cmcApiKey) {
      try {
        cmcData = await loggedApiFetch(
          supabase,
          `CoinMarketCap-${symbol}`,
          `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
          async (res) => {
            const data = await res.json();
            return { dominance: data.data[symbol].quote.USD.market_cap_dominance };
          },
          { 'X-CMC_PRO_API_KEY': cmcApiKey, 'Accept': 'application/json' }
        );
      } catch (e) {
        console.warn(`[CMC-${symbol}] Optional API failed:`, e.message);
      }
    }

    let newsData = { count: 0, sentiment: 'neutral', headlines: [] };
    const cpApiKey = Deno.env.get('CRYPTOPANIC_API_KEY');
    if (cpApiKey) {
      try {
        newsData = await loggedApiFetch(
          supabase,
          `CryptoPanic-${symbol}`,
          `https://cryptopanic.com/api/v1/posts/?auth_token=${cpApiKey}&currencies=${symbol}&filter=hot&public=true`,
          async (res) => {
            const data = await res.json();
            const posts = data.results || [];
            const headlines = posts.slice(0, 5).map((p: any) => p.title);
            const positive = posts.filter((p: any) => p.votes?.positive > p.votes?.negative).length;
            const negative = posts.filter((p: any) => p.votes?.negative > p.votes?.positive).length;

            let sentiment = 'neutral';
            if (positive > negative * 1.5) sentiment = 'bullish';
            else if (negative > positive * 1.5) sentiment = 'bearish';

            return { count: posts.length, sentiment, headlines };
          }
        );
      } catch (e) {
        console.warn(`[CryptoPanic-${symbol}] Optional API failed:`, e.message);
      }
    }

    const combinedData = {
      market: {
        ...marketData,
        dominance: cmcData.dominance
      },
      news: newsData,
      timestamp: new Date().toISOString()
    };

    await supabase.from('api_cache').upsert({
      api_name: `scan_market_${symbol.toLowerCase()}`,
      source: 'combined',
      response_data: combinedData,
      fetched_at: new Date().toISOString()
    });

    const analysis = await analyzeWithClaude(symbol, combinedData, claudeApiKey, supabase);

    await supabase.from('function_logs').insert({
      function_name: 'scan-market-v2',
      model_name: 'claude-3-5-haiku-20241022',
      success: true,
      latency_ms: Date.now() - start,
      metadata: { symbol: tradingPair, analysis }
    });

    return {
      symbol: tradingPair,
      data: combinedData,
      analysis,
      latency_ms: Date.now() - start
    };

  } catch (error) {
    console.error(`[scan-market-v2] Error scanning ${symbol}:`, error);
    throw error;
  }
}

async function loggedApiFetch(
  supabase: any,
  apiName: string,
  url: string,
  processor: (res: Response) => Promise<any>,
  headers: Record<string, string> = {}
): Promise<any> {
  const start = Date.now();

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    const responseTime = Date.now() - start;

    if (!response.ok) {
      await supabase.rpc('log_api_call', {
        p_api_name: apiName,
        p_endpoint: url,
        p_status: 'ERROR',
        p_status_code: response.status,
        p_rows_received: 0,
        p_response_time_ms: responseTime,
        p_error_message: `HTTP ${response.status}`
      });
      throw new Error(`${apiName} API error: ${response.status}`);
    }

    const data = await processor(response);
    const rowsReceived = Array.isArray(data) ? data.length : 1;

    await supabase.rpc('log_api_call', {
      p_api_name: apiName,
      p_endpoint: url,
      p_status: 'OK',
      p_status_code: 200,
      p_rows_received: rowsReceived,
      p_response_time_ms: responseTime
    });

    return data;

  } catch (error) {
    const responseTime = Date.now() - start;
    await supabase.rpc('log_api_call', {
      p_api_name: apiName,
      p_endpoint: url,
      p_status: 'TIMEOUT',
      p_response_time_ms: responseTime,
      p_error_message: error.message
    });
    throw error;
  }
}

async function analyzeWithClaude(symbol: string, data: any, apiKey: string, supabase: any): Promise<string> {
  const start = Date.now();

  try {
    const prompt = `Analyse rapide ${symbol} en français (2-3 phrases max).

Prix: ${data.market.price} USD
Change 24h: ${data.market.change24h}%
Volume 24h: ${data.market.volume24h}
Sentiment news: ${data.news.sentiment} (${data.news.count} articles)

Donne: tendance (bullish/bearish/neutral) + raison principale.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      await supabase.rpc('log_api_call', {
        p_api_name: `Claude-Haiku-${symbol}`,
        p_endpoint: 'anthropic.com/v1/messages',
        p_status: 'ERROR',
        p_status_code: response.status,
        p_response_time_ms: responseTime,
        p_error_message: `HTTP ${response.status}`
      });
      return 'Analyse indisponible';
    }

    const result = await response.json();

    await supabase.rpc('log_api_call', {
      p_api_name: `Claude-Haiku-${symbol}`,
      p_endpoint: 'anthropic.com/v1/messages',
      p_status: 'OK',
      p_status_code: 200,
      p_rows_received: 1,
      p_response_time_ms: responseTime
    });

    return result.content[0].text;

  } catch (error) {
    console.error(`[Claude-${symbol}] Error:`, error);
    return 'Analyse échouée';
  }
}