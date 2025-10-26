import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ApiValidationResult {
  api: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  cached?: boolean;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: ApiValidationResult[] = [];

    // 🟢 1️⃣ Test Binance REST API with fallback
    try {
      const BINANCE_URLS = [
        'https://api-gateway.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
        'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT',
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
      ];

      let binanceData = null;
      let successUrl = null;

      for (const url of BINANCE_URLS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data.symbol && data.price) {
              binanceData = data;
              successUrl = url;
              break;
            }
          }
        } catch (err) {
          console.log(`Binance URL failed: ${url}`);
        }
      }

      if (binanceData) {
        results.push({
          api: 'Binance',
          status: 'success',
          data: {
            symbol: binanceData.symbol,
            price: parseFloat(binanceData.price),
            timestamp: new Date().toISOString(),
            source: successUrl
          },
          timestamp: new Date().toISOString()
        });

        await supabase.from('api_cache').upsert({
          api_name: 'binance',
          endpoint: 'ticker/price',
          response_data: binanceData,
          cached_at: new Date().toISOString()
        }, { onConflict: 'api_name,endpoint' });
      } else {
        throw new Error('All Binance endpoints unavailable (region restricted)');
      }
    } catch (error) {
      results.push({
        api: 'Binance',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // 🟣 2️⃣ Test CoinMarketCap API
    try {
      const cmcApiKey = Deno.env.get('CMC_API_KEY');
      if (!cmcApiKey) throw new Error('CMC_API_KEY not configured');

      const cmcResponse = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5',
        {
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
            'Accept': 'application/json'
          }
        }
      );
      
      const cmcData = await cmcResponse.json();
      
      if (cmcData.data && Array.isArray(cmcData.data)) {
        const btcData = cmcData.data[0];
        results.push({
          api: 'CoinMarketCap',
          status: 'success',
          data: {
            name: btcData.name,
            price: btcData.quote.USD.price,
            volume_24h: btcData.quote.USD.volume_24h,
            market_cap: btcData.quote.USD.market_cap,
            items_count: cmcData.data.length
          },
          timestamp: new Date().toISOString()
        });

        // Store in cache (expires after 10 minutes)
        await supabase.from('api_cache').upsert({
          api_name: 'coinmarketcap',
          endpoint: 'listings/latest',
          response_data: cmcData.data,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }, { onConflict: 'api_name,endpoint' });
      } else {
        throw new Error('Invalid CoinMarketCap response structure');
      }
    } catch (error) {
      results.push({
        api: 'CoinMarketCap',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // 🔵 3️⃣ Test CoinGecko API
    try {
      // Check cache first to avoid rate limits
      const { data: cachedData } = await supabase
        .from('api_cache')
        .select('response_data, cached_at')
        .eq('api_name', 'coingecko')
        .eq('endpoint', 'coins/markets')
        .single();

      let coingeckoData;
      let fromCache = false;

      if (cachedData && new Date(cachedData.cached_at) > new Date(Date.now() - 10 * 60 * 1000)) {
        // Use cached data if less than 10 minutes old
        coingeckoData = cachedData.response_data;
        fromCache = true;
      } else {
        // Fetch fresh data
        const cgResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,ripple,cardano&order=market_cap_desc'
        );
        
        if (cgResponse.status === 429) {
          throw new Error('Rate limit exceeded (429). Using cache.');
        }
        
        coingeckoData = await cgResponse.json();
        
        // Store in cache
        await supabase.from('api_cache').upsert({
          api_name: 'coingecko',
          endpoint: 'coins/markets',
          response_data: coingeckoData,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }, { onConflict: 'api_name,endpoint' });
      }

      if (Array.isArray(coingeckoData) && coingeckoData.length > 0) {
        results.push({
          api: 'CoinGecko',
          status: 'success',
          data: {
            items_count: coingeckoData.length,
            bitcoin: {
              price: coingeckoData[0].current_price,
              market_cap: coingeckoData[0].market_cap,
              volume_24h: coingeckoData[0].total_volume
            }
          },
          cached: fromCache,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Invalid CoinGecko response structure');
      }
    } catch (error) {
      results.push({
        api: 'CoinGecko',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // 🟡 4️⃣ Test CryptoPanic API
    try {
      const cryptoPanicToken = Deno.env.get('CRYPTOPANIC_API_KEY');
      if (!cryptoPanicToken) throw new Error('CRYPTOPANIC_API_KEY not configured');

      const cpResponse = await fetch(
        `https://cryptopanic.com/api/v1/posts/?auth_token=${cryptoPanicToken}&currencies=BTC,ETH&filter=hot`
      );
      
      const cpData = await cpResponse.json();
      
      if (cpData.results && Array.isArray(cpData.results)) {
        const sentimentStats = {
          positive: cpData.results.filter((p: any) => p.votes?.positive > p.votes?.negative).length,
          negative: cpData.results.filter((p: any) => p.votes?.negative > p.votes?.positive).length,
          neutral: cpData.results.filter((p: any) => !p.votes || p.votes.positive === p.votes.negative).length
        };

        results.push({
          api: 'CryptoPanic',
          status: 'success',
          data: {
            news_count: cpData.results.length,
            sentiment: sentimentStats,
            latest_title: cpData.results[0]?.title || 'N/A'
          },
          timestamp: new Date().toISOString()
        });

        // Store in cache
        await supabase.from('api_cache').upsert({
          api_name: 'cryptopanic',
          endpoint: 'posts',
          response_data: cpData.results,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }, { onConflict: 'api_name,endpoint' });
      } else {
        throw new Error('Invalid CryptoPanic response structure');
      }
    } catch (error) {
      results.push({
        api: 'CryptoPanic',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // 🧠 5️⃣ Test Santiment API
    try {
      const santimentApiKey = Deno.env.get('SANTIMENT_API_KEY');
      if (!santimentApiKey) throw new Error('SANTIMENT_API_KEY not configured');

      const query = `
        query {
          getMetric(metric: "daily_active_addresses") {
            timeseriesData(
              slug: "bitcoin"
              from: "utc_now-7d"
              to: "utc_now"
              interval: "1d"
            ) {
              datetime
              value
            }
          }
          socialVolume: getMetric(metric: "social_volume_total") {
            timeseriesData(
              slug: "bitcoin"
              from: "utc_now-7d"
              to: "utc_now"
              interval: "1d"
            ) {
              datetime
              value
            }
          }
        }
      `;

      const santimentResponse = await fetch('https://api.santiment.net/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${santimentApiKey}`
        },
        body: JSON.stringify({ query })
      });

      const santimentData = await santimentResponse.json();
      
      if (santimentData.data) {
        const activeAddresses = santimentData.data.getMetric?.timeseriesData || [];
        const socialVolume = santimentData.data.socialVolume?.timeseriesData || [];
        
        const latestActiveAddresses = activeAddresses[activeAddresses.length - 1]?.value || 0;
        const latestSocialVolume = socialVolume[socialVolume.length - 1]?.value || 0;

        results.push({
          api: 'Santiment',
          status: 'success',
          data: {
            daily_active_addresses: latestActiveAddresses,
            social_volume: latestSocialVolume,
            data_points: activeAddresses.length
          },
          timestamp: new Date().toISOString()
        });

        // Store in cache
        await supabase.from('api_cache').upsert({
          api_name: 'santiment',
          endpoint: 'graphql',
          response_data: santimentData.data,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        }, { onConflict: 'api_name,endpoint' });
      } else if (santimentData.errors) {
        throw new Error(`GraphQL Error: ${santimentData.errors[0].message}`);
      } else {
        throw new Error('Invalid Santiment response structure');
      }
    } catch (error) {
      results.push({
        api: 'Santiment',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Summary
    const summary = {
      total_apis: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      cached_responses: results.filter(r => r.cached).length
    };

    return new Response(
      JSON.stringify({
        summary,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in api-validator:', error);
    return new Response(
      JSON.stringify({ 
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